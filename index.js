// On importe les outils dont on a besoin :
// - express : pour créer le serveur web (recevoir des requêtes, envoyer des pages)
// - pg : pour parler avec la base de données PostgreSQL
// - dotenv/config : pour lire les informations secrètes (mot de passe, etc.) depuis un fichier .env
import express from "express";
import pg from "pg";
import "dotenv/config";

// On crée notre application Express (le "serveur")
const app = express();

// Le port sur lequel le serveur va écouter (ex: http://localhost:3000)
// Si la variable PORT existe (par exemple sur un hébergeur en ligne), on l'utilise, sinon 3000 par défaut
const port = process.env.PORT || 3000;

// On crée la connexion à la base de données.
// Si on a une "DATABASE_URL" (utilisé en production), on l'utilise directement.
// Sinon, on utilise les infos séparées (utilisateur, hôte, nom de la base, mot de passe, port) pour développer en local.
const db = new pg.Client(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        : {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
        }
);

// On se connecte réellement à la base de données avant de continuer
await db.connect();

// On dit à Express de comprendre les données envoyées par les formulaires HTML classiques
app.use(express.urlencoded({ extended: true }));
// On dit à Express de servir les fichiers du dossier "public" tels quels (CSS, JS, images...)
app.use(express.static("public"));
// On dit à Express de comprendre les données envoyées en JSON (utilisé par nos appels fetch())
app.use(express.json());


// On indique à Express qu'on utilise le moteur de templates "EJS" pour générer les pages HTML
app.set("view engine", "ejs");

// Petit dictionnaire qui donne le nom d'unité à afficher selon le type de suivi d'un aliment
// (par exemple : "unite" -> "unités", "pack" -> "packs", "cl" -> "cl")
const uniteParType = { unite: 'unités', pack: 'packs', cl: 'cl' };

// Liste fixe des courses habituelles de la semaine (bouton "preset" sur la page Courses).
// Chaque entrée a soit un food_id (aliment connu dans la table "foods"), soit un nom_libre
// (texte libre, pour "Lait PPC Vanille" qui n'existe pas encore comme aliment).
const PRESET_COURSES_HEBDO = [
    { food_id: "yaourt-grec" },
    { food_id: "carotte" },
    { food_id: "tomate" },
    { food_id: "banane" },
    { food_id: "yaourt" },
    { food_id: "pomme-de-terre" },
    { food_id: "patate-douce" },
    { food_id: "corne-verte" },
    { food_id: "corne-rouge" },
    { food_id: "mozzarella" },
    { food_id: "feta" },
    { food_id: "roquette" },
    { food_id: "mache" },
    { nom_libre: "Lait PPC Vanille" },
    { food_id: "chips" },
];

//Function

// Récupère la liste de tous les aliments connus dans la table "foods"
async function chercherAliments() {
    const result = await db.query("SELECT * FROM foods");
    return result.rows
}

// Récupère tout le stock actuel, en associant chaque ligne de stock à son aliment (nom, emoji, photo, type, emplacement)
async function chercherStock() {
    const result = await db.query("SELECT stock.*, foods.nom, foods.emoji, foods.image, foods.tracking_type, foods.emplacement FROM stock JOIN foods ON stock.food_id = foods.id");
    // Pour chaque article du stock, on calcule le nombre de jours écoulés depuis sa dernière mise à jour
    const aujourdhui = new Date();
    result.rows.forEach(row => {
        const diff = aujourdhui - new Date(row.date_maj);
        // On convertit la différence (en millisecondes) en nombre de jours entiers
        row.jours_depuis = Math.floor(diff / (1000 * 60 * 60 * 24));
    });
    return result.rows
}

// Récupère la liste de courses (uniquement les articles pas encore achetés)
// Si l'article existe dans "foods" on prend son nom/emoji, sinon on utilise le nom libre tapé par l'utilisateur
async function chercherCourses() {
    const result = await db.query("SELECT courses.*, COALESCE(foods.nom, courses.nom_libre) AS nom, COALESCE(foods.emoji, '🆕') AS emoji, foods.unite AS food_unite, foods.tracking_type, foods.categorie FROM courses LEFT JOIN foods ON courses.food_id = foods.id WHERE achete = false");
    return result.rows
}

// Récupère la liste des recettes (juste id + nom), triée par ordre alphabétique
async function chercherRecettes() {
    const result = await db.query("SELECT id, nom FROM recettes ORDER BY nom ASC");
    return result.rows;
}

// Récupère le journal alimentaire du jour (tout ce qui a été mangé aujourd'hui)
// et calcule les calories/glucides/protéines/lipides réels en fonction de la quantité mangée
async function chercherJournalDuJour() {
    const result = await db.query(
        `SELECT journal_repas.*, foods.nom, foods.emoji, foods.categorie,
                ROUND(foods.calories * journal_repas.quantite_g / 100, 1) AS calories_calc,
                ROUND(foods.glucides * journal_repas.quantite_g / 100, 1) AS glucides_calc,
                ROUND(foods.proteines * journal_repas.quantite_g / 100, 1) AS proteines_calc,
                ROUND(foods.lipides * journal_repas.quantite_g / 100, 1) AS lipides_calc
         FROM journal_repas
         JOIN foods ON journal_repas.food_id = foods.id
         WHERE date_entree = CURRENT_DATE
         ORDER BY heure_entree ASC`
    );
    return result.rows;
}

// ============================================
// PAGE D'ACCUEIL
// ============================================

// Page d'accueil : on affiche simplement la vue "index.ejs"
app.get("/", async (req, res) => {
    try {
        res.render("index.ejs", { title: "Accueil" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// ============================================
// ALIMENTS
// ============================================

// Page listant tous les aliments connus
app.get("/aliments", async (req, res) => {
    try {
        const aliments = await chercherAliments()
        res.render("aliments.ejs", {
            title: "Aliments",
            aliments: aliments

        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Page détail d'un seul aliment, retrouvé grâce à son id dans l'URL (ex: /aliments/5)
app.get("/aliments/:idAliment", async (req, res) => {
    try {
        const idAliment = req.params.idAliment;
        const result = await db.query("SELECT * FROM foods WHERE id = $1", [idAliment]);
        const aliment = result.rows[0];
        // Si aucun aliment ne correspond à cet id, on affiche quand même la page mais avec un message "introuvable"
        if (!aliment) { return res.status(404).render("aliment-detail.ejs", { title: "Aliment introuvable", aliment: null }); }
        res.render("aliment-detail.ejs", {
            title: aliment.nom,
            aliment: aliment
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// ============================================
// STOCK
// ============================================

// Page du stock : on affiche le stock actuel + la liste des aliments (utile pour l'autocomplétion d'ajout)
app.get("/stock", async (req, res) => {
    try {
        const stock = await chercherStock()
        const aliments = await chercherAliments()
        res.render("stock.ejs", {
            title: "Stock",
            stock: stock,
            aliments: aliments,


        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Ajouter un nouvel article dans le stock
app.post("/stock/ajouter", async (req, res) => {
    const idAliment = req.body.idAliment;
    const quantiteAliment = req.body.quantiteAliment;
    try {
        // On vérifie que les champs obligatoires ont bien été envoyés
        if (!idAliment || !quantiteAliment) {
            return res.status(400).json({ erreur: "Champs requis." });
        }
        // On va chercher les infos de cet aliment (son type de suivi, son nom, son emplacement, son emoji, sa photo)
        const result = await db.query("SELECT tracking_type, nom, emplacement, emoji, image FROM foods WHERE id = $1", [idAliment]);
        if (result.rows.length === 0) {
            return res.status(400).json({ erreur: "Article introuvable." });
        }
        const tracking_type = result.rows[0].tracking_type;
        const nom = result.rows[0].nom;
        const emoji = result.rows[0].emoji;
        const image = result.rows[0].image;
        // On déduit l'unité à utiliser (unités, packs ou cl) grâce au dictionnaire défini plus haut
        const unite = uniteParType[tracking_type];
        const emplacement = result.rows[0].emplacement;


        // On vérifie que cet aliment n'est pas déjà présent dans le stock (on ne veut pas de doublon)
        const existeDeja = await db.query("SELECT 1 FROM stock WHERE food_id = $1", [idAliment]);
        if (existeDeja.rows.length > 0) {
            return res.status(400).json({ erreur: `L'article ${nom} est déjà dans le stock.` });
        }

        // On insère la nouvelle ligne de stock, avec la date de mise à jour = maintenant
        const insertResult = await db.query(
            "INSERT INTO stock (food_id, quantite, unite, date_maj) VALUES ($1, $2, $3, NOW()) RETURNING id",
            [idAliment, quantiteAliment, unite]
        );

        // On renvoie au navigateur les infos du nouvel article, pour qu'il puisse l'afficher sans recharger la page
        res.json({
            succes: true,
            item: {
                id: insertResult.rows[0].id,
                nom: nom,
                emoji: emoji,
                image: image,
                quantite: quantiteAliment,
                unite: unite,
                tracking_type: tracking_type,
                emplacement: emplacement,
                jours_depuis: 0
            }
        });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// Modifier la quantité d'un article déjà présent dans le stock (édition inline)
app.post("/stock/modifier", async (req, res) => {
    try {
        const nouvelleQuantite = req.body.nouvelleQuantite;
        const idStock = req.body.idStock;

        if (!nouvelleQuantite) {
            return res.status(400).json({ erreur: "Champs requis." });
        }

        // On met à jour la quantité et la date de mise à jour (pour recalculer "il y a X jours")
        await db.query("UPDATE stock SET quantite = $1, date_maj = NOW() WHERE id = $2", [nouvelleQuantite, idStock]);
        res.json({ succes: true, quantite: nouvelleQuantite });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// Supprimer un article du stock
app.post("/stock/supprimer", async (req, res) => {
    try {
        const idStock = req.body.idStock;
        if (!idStock) {
            return res.status(400).json({ erreur: "Aucune ligne sélectionnée" });
        }

        await db.query("DELETE FROM stock WHERE id = $1", [idStock]);
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// ============================================
// COURSES
// ============================================

// Page de la liste de courses : on affiche les courses à faire + la liste des aliments (autocomplétion) + le stock actuel
app.get("/courses", async (req, res) => {
    try {
        const courses = await chercherCourses()
        const aliments = await chercherAliments()
        const stock = await chercherStock()

        res.render("courses.ejs", {
            title: "Courses",
            courses: courses,
            aliments: aliments,
            stock: stock
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Ajouter un article à la liste de courses
// On peut soit choisir un aliment existant (idAliment), soit taper un nom libre qui n'existe pas encore dans "foods"
app.post("/courses/ajouter", async (req, res) => {
    const idAliment = req.body.idAliment || null;
    const texteTape = req.body.rechercheAliment;
    try {
        if (!idAliment && !texteTape) {
            return res.status(400).json({ erreur: "Champs requis." });
        }

        // Si on a un idAliment, on ne remplit pas nom_libre (et inversement)
        const insertResult = await db.query(
            "INSERT INTO courses (food_id, nom_libre) VALUES ($1, $2) RETURNING id",
            [idAliment || null, idAliment ? null : texteTape]
        );
        const nouvelId = insertResult.rows[0].id;

        // On relit la ligne fraîchement créée, avec toutes ses infos affichables (nom, emoji, etc.)
        const itemResult = await db.query(
            "SELECT courses.*, COALESCE(foods.nom, courses.nom_libre) AS nom, COALESCE(foods.emoji, '🆕') AS emoji, foods.unite AS food_unite, foods.tracking_type, foods.categorie FROM courses LEFT JOIN foods ON courses.food_id = foods.id WHERE courses.id = $1",
            [nouvelId]
        );

        res.json({ succes: true, item: itemResult.rows[0] });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// Ajouter d'un coup toutes les courses habituelles de la semaine (voir PRESET_COURSES_HEBDO).
// Contrairement à la recette de /calories/ajouter-recette, on n'efface rien : on ajoute seulement
// les articles du preset qui ne sont pas déjà dans la liste de courses en attente (pour ne pas créer
// de doublons si on clique plusieurs fois sur le bouton).
app.post("/courses/preset-hebdo", async (req, res) => {
    try {
        // On récupère ce qui est déjà dans la liste (pas encore acheté), pour savoir quoi ne pas dupliquer
        const dejaLa = await db.query("SELECT food_id, nom_libre FROM courses WHERE achete = false");
        const foodIdsDejaLa = new Set(dejaLa.rows.map(r => r.food_id).filter(Boolean));
        const nomsLibresDejaLa = new Set(
            dejaLa.rows.filter(r => !r.food_id && r.nom_libre).map(r => r.nom_libre.toLowerCase())
        );

        const nouveauxIds = [];

        for (const article of PRESET_COURSES_HEBDO) {
            if (article.food_id) {
                if (foodIdsDejaLa.has(article.food_id)) continue; // déjà présent, on ne l'ajoute pas une 2e fois
                const insertResult = await db.query(
                    "INSERT INTO courses (food_id, nom_libre) VALUES ($1, NULL) RETURNING id",
                    [article.food_id]
                );
                nouveauxIds.push(insertResult.rows[0].id);
            } else {
                if (nomsLibresDejaLa.has(article.nom_libre.toLowerCase())) continue;
                const insertResult = await db.query(
                    "INSERT INTO courses (food_id, nom_libre) VALUES (NULL, $1) RETURNING id",
                    [article.nom_libre]
                );
                nouveauxIds.push(insertResult.rows[0].id);
            }
        }

        // Si tout était déjà dans la liste, on renvoie une liste vide (rien de neuf à afficher)
        if (nouveauxIds.length === 0) {
            return res.json({ succes: true, items: [] });
        }

        // On relit tous les articles fraîchement ajoutés, avec leurs infos affichables (nom, emoji, etc.)
        const itemsResult = await db.query(
            "SELECT courses.*, COALESCE(foods.nom, courses.nom_libre) AS nom, COALESCE(foods.emoji, '🆕') AS emoji, foods.unite AS food_unite, foods.tracking_type, foods.categorie FROM courses LEFT JOIN foods ON courses.food_id = foods.id WHERE courses.id = ANY($1)",
            [nouveauxIds]
        );

        res.json({ succes: true, items: itemsResult.rows });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// Ajouter/modifier un commentaire sur un article de la liste de courses
app.post("/courses/commentaire", async (req, res) => {
    try {
        const idCourse = req.body.idCourse;
        const commentaire = req.body.commentaire;

        if (!idCourse) {
            return res.status(400).json({ erreur: "Aucun article sélectionné." });
        }

        await db.query("UPDATE courses SET commentaire = $1 WHERE id = $2", [commentaire, idCourse]);
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// Supprimer un article de la liste de courses
app.post("/courses/supprimer", async (req, res) => {
    try {
        const idCourse = req.body.idCourse;
        if (!idCourse) {
            return res.status(400).json({ erreur: "Aucune ligne sélectionnée" });
        }

        await db.query("DELETE FROM courses WHERE id = $1", [idCourse]);
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// Marquer un article de courses comme acheté, et l'ajouter (ou le mettre à jour) dans le stock
app.post("/courses/acheter", async (req, res) => {
    try {
        let tracking_type = null;
        const idCourse = req.body.idCourse;
        const quantiteAchetee = req.body.quantiteAchetee;

        if (!idCourse) {
            return res.status(400).json({ erreur: "Aucun article sélectionné." });
        }

        // On retrouve à quel aliment (foods) correspond cette ligne de courses
        const courseResult = await db.query("SELECT food_id FROM courses WHERE id = $1", [idCourse]);
        if (courseResult.rows.length === 0) {
            return res.status(400).json({ erreur: "Article introuvable." });
        }
        const foodId = courseResult.rows[0].food_id;

        // Si l'article de courses correspond bien à un aliment connu (et pas juste un nom libre), on met à jour le stock
        if (foodId) {
            const resultFood = await db.query("SELECT tracking_type FROM foods WHERE id = $1", [foodId]);
            tracking_type = resultFood.rows[0].tracking_type;

            if (tracking_type === 'cl') {
                // Pour les aliments suivis en "cl" (bouteille), acheter = remettre le niveau à "plein"
                // ON CONFLICT : si l'aliment est déjà dans le stock, on met juste à jour au lieu de créer un doublon
                await db.query(
                    "INSERT INTO stock (food_id, quantite, date_maj) VALUES ($1, 'plein', NOW()) ON CONFLICT (food_id) DO UPDATE SET quantite = 'plein', date_maj = NOW()",
                    [foodId]
                );
            } else {
                // Pour les autres aliments (unités, packs), on demande la quantité achetée
                if (!quantiteAchetee) {
                    return res.status(400).json({ erreur: "Quantité requise." });
                }
                // Si l'aliment est déjà dans le stock, on additionne la quantité achetée à celle qui existe déjà
                await db.query(
                    "INSERT INTO stock (food_id, quantite, date_maj) VALUES ($1, $2, NOW()) ON CONFLICT (food_id) DO UPDATE SET quantite = (stock.quantite::integer + $2::integer)::text, date_maj = NOW()",
                    [foodId, quantiteAchetee]
                );
            }
        }

        // Dans tous les cas, on marque l'article de courses comme acheté
        await db.query("UPDATE courses SET achete = true WHERE id = $1", [idCourse]);
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// ============================================
// CALORIES
// ============================================

// Page calories : on affiche le journal du jour + la liste des aliments + la liste des recettes
app.get("/calories", async (req, res) => {
    try {
        const journal = await chercherJournalDuJour();
        const aliments = await chercherAliments();
        const recettes = await chercherRecettes();
        res.render("calories.ejs", {
            title: "Calories",
            journal: journal,
            aliments: aliments,
            recettes: recettes
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// -- POST /calories/ajouter : remplace l'ancienne (quantiteG optionnelle, défaut 100) --

// Ajouter un aliment mangé dans le journal du jour (par défaut 100g si aucune quantité n'est précisée)
app.post("/calories/ajouter", async (req, res) => {
    try {
        const idAliment = req.body.idAliment;
        const quantiteG = req.body.quantiteG || 100;

        if (!idAliment) {
            return res.status(400).json({ erreur: "Champs requis." });
        }

        const insertResult = await db.query(
            "INSERT INTO journal_repas (food_id, quantite_g) VALUES ($1, $2) RETURNING id",
            [idAliment, quantiteG]
        );
        const nouvelId = insertResult.rows[0].id;

        // On relit la nouvelle entrée avec ses valeurs nutritionnelles déjà calculées
        const itemResult = await db.query(
            `SELECT journal_repas.*, foods.nom, foods.emoji, foods.categorie,
            ROUND(foods.calories * journal_repas.quantite_g / 100, 1) AS calories_calc,
            ROUND(foods.glucides * journal_repas.quantite_g / 100, 1) AS glucides_calc,
            ROUND(foods.proteines * journal_repas.quantite_g / 100, 1) AS proteines_calc,
            ROUND(foods.lipides * journal_repas.quantite_g / 100, 1) AS lipides_calc
     FROM journal_repas
     JOIN foods ON journal_repas.food_id = foods.id
     WHERE journal_repas.id = $1`,
            [nouvelId]
        );
        res.json({ succes: true, item: itemResult.rows[0] });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// -- POST /calories/modifier : nouvelle route, édition inline de la quantité --

// Modifier la quantité (en grammes) d'une entrée déjà présente dans le journal du jour
app.post("/calories/modifier", async (req, res) => {
    try {
        const idEntree = req.body.idEntree;
        const nouvelleQuantite = req.body.nouvelleQuantite;

        if (!idEntree || !nouvelleQuantite) {
            return res.status(400).json({ erreur: "Champs requis." });
        }

        await db.query("UPDATE journal_repas SET quantite_g = $1 WHERE id = $2", [nouvelleQuantite, idEntree]);

        // On relit l'entrée mise à jour, avec ses valeurs nutritionnelles recalculées
        const itemResult = await db.query(
            `SELECT journal_repas.*, foods.nom, foods.emoji,
                    ROUND(foods.calories * journal_repas.quantite_g / 100, 1) AS calories_calc,
                    ROUND(foods.glucides * journal_repas.quantite_g / 100, 1) AS glucides_calc,
                    ROUND(foods.proteines * journal_repas.quantite_g / 100, 1) AS proteines_calc,
                    ROUND(foods.lipides * journal_repas.quantite_g / 100, 1) AS lipides_calc
             FROM journal_repas
             JOIN foods ON journal_repas.food_id = foods.id
             WHERE journal_repas.id = $1`,
            [idEntree]
        );

        res.json({ succes: true, item: itemResult.rows[0] });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// -- POST /calories/supprimer : identique à avant, garder tel quel --
// Supprimer une entrée du journal alimentaire
app.post("/calories/supprimer", async (req, res) => {
    try {
        const idEntree = req.body.idEntree;
        if (!idEntree) {
            return res.status(400).json({ erreur: "Aucune ligne sélectionnée" });
        }

        await db.query("DELETE FROM journal_repas WHERE id = $1", [idEntree]);
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});


// -- POST /calories/vider : nouvelle route, Tout Effacer --

// Vider complètement le journal du jour (bouton "Tout effacer")
app.post("/calories/vider", async (req, res) => {
    try {
        await db.query("DELETE FROM journal_repas WHERE date_entree = CURRENT_DATE");
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// -- POST /calories/ajouter-recette : nouvelle route, applique une recette --

// Remplace le journal du jour par tous les ingrédients d'une recette sélectionnée
app.post("/calories/ajouter-recette", async (req, res) => {
    // On garde une trace si une transaction SQL a été démarrée, pour savoir si on doit l'annuler en cas d'erreur
    let transactionStarted = false;

    try {
        const idRecette = req.body.idRecette;

        if (!idRecette) {
            return res.status(400).json({
                erreur: "Aucune recette sélectionnée."
            });
        }

        // On récupère la liste des ingrédients de cette recette
        const ingredients = await db.query(
            "SELECT food_id, quantite_g FROM recette_ingredients WHERE recette_id = $1",
            [idRecette]
        );

        if (ingredients.rows.length === 0) {
            return res.status(400).json({
                erreur: "Cette recette n'a aucun ingrédient."
            });
        }

        // On démarre une transaction : soit toutes les opérations réussissent, soit aucune n'est appliquée
        // (utile ici car on supprime le journal du jour ET on insère plusieurs lignes d'un coup)
        await db.query("BEGIN");
        transactionStarted = true;

        // On vide d'abord le journal du jour (la recette remplace tout ce qui a été mangé aujourd'hui)
        await db.query(
            "DELETE FROM journal_repas WHERE date_entree = CURRENT_DATE"
        );

        const nouvellesEntrees = [];

        // On insère une ligne de journal pour chaque ingrédient de la recette
        for (const ingredient of ingredients.rows) {
            const insertResult = await db.query(
                "INSERT INTO journal_repas (food_id, quantite_g) VALUES ($1, $2) RETURNING id",
                [ingredient.food_id, ingredient.quantite_g]
            );

            nouvellesEntrees.push(insertResult.rows[0].id);
        }

        // On relit toutes les nouvelles entrées créées, avec leurs valeurs nutritionnelles calculées
        const itemsResult = await db.query(`
            SELECT
                journal_repas.*,
                foods.nom,
                foods.emoji,
                foods.categorie,
                ROUND(foods.calories * journal_repas.quantite_g / 100, 1) AS calories_calc,
                ROUND(foods.glucides * journal_repas.quantite_g / 100, 1) AS glucides_calc,
                ROUND(foods.proteines * journal_repas.quantite_g / 100, 1) AS proteines_calc,
                ROUND(foods.lipides * journal_repas.quantite_g / 100, 1) AS lipides_calc
            FROM journal_repas
            JOIN foods
                ON journal_repas.food_id = foods.id
            WHERE journal_repas.id = ANY($1)
            ORDER BY journal_repas.heure_entree ASC
        `, [nouvellesEntrees]);

        // Tout s'est bien passé : on valide définitivement la transaction
        await db.query("COMMIT");
        transactionStarted = false;

        res.json({
            succes: true,
            items: itemsResult.rows
        });

    } catch (err) {
        // En cas d'erreur, si une transaction avait été démarrée, on annule tout (ROLLBACK)
        // pour ne pas laisser la base de données dans un état à moitié modifié
        if (transactionStarted) {
            await db.query("ROLLBACK");
        }

        console.log(err);
        res.status(500).json({
            erreur: err.message
        });
    }
});

// -- POST /recettes/creer : nouvelle route, création d'une recette --

// Créer une nouvelle recette avec sa liste d'ingrédients
app.post("/recettes/creer", async (req, res) => {
    try {
        const nom = req.body.nom;
        const ingredients = req.body.ingredients;

        if (!nom || !ingredients || ingredients.length === 0) {
            return res.status(400).json({ erreur: "Nom et au moins un ingrédient requis." });
        }

        // On crée d'abord la recette elle-même
        const recetteResult = await db.query(
            "INSERT INTO recettes (nom) VALUES ($1) RETURNING id",
            [nom]
        );
        const idRecette = recetteResult.rows[0].id;

        // Puis on ajoute chacun de ses ingrédients, un par un
        for (const ingredient of ingredients) {
            await db.query(
                "INSERT INTO recette_ingredients (recette_id, food_id, quantite_g) VALUES ($1, $2, $3)",
                [idRecette, ingredient.food_id, ingredient.quantite_g]
            );
        }

        res.json({ succes: true, recette: { id: idRecette, nom: nom } });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

// On démarre le serveur : à partir de maintenant, il écoute les requêtes sur le port choisi
app.listen(port, () => {
    console.log(`API is running at http://localhost:${port}`);
});
