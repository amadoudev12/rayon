-- Renommage des modèles et des champs en français, sans perte de données.
--
-- Migration écrite à la main : Prisma génère des DROP/CREATE pour un
-- renommage (ce qui effacerait les données). MariaDB 10.4 ne connaît pas
-- RENAME COLUMN ni RENAME INDEX, on utilise donc CHANGE COLUMN et on
-- supprime / recrée les index.
--
-- Étapes :
--   1. Supprimer les clés étrangères (et les index créés automatiquement pour elles).
--   2. Renommer les tables.
--   3. Renommer les colonnes, puis recréer les index sous leurs nouveaux noms.
--   4. Recréer les clés étrangères.

-- ---------------------------------------------------------------------------
-- 1. Suppression des clés étrangères
-- ---------------------------------------------------------------------------

ALTER TABLE `Membership`
    DROP FOREIGN KEY `Membership_userId_fkey`,
    DROP FOREIGN KEY `Membership_organizationId_fkey`,
    DROP FOREIGN KEY `Membership_storeId_fkey`;

ALTER TABLE `Store` DROP FOREIGN KEY `Store_organizationId_fkey`;

ALTER TABLE `Category` DROP FOREIGN KEY `Category_organizationId_fkey`;

ALTER TABLE `Product`
    DROP FOREIGN KEY `Product_organizationId_fkey`,
    DROP FOREIGN KEY `Product_categoryId_fkey`;

ALTER TABLE `Stock`
    DROP FOREIGN KEY `Stock_storeId_fkey`,
    DROP FOREIGN KEY `Stock_productId_fkey`;

ALTER TABLE `StockMovement`
    DROP FOREIGN KEY `StockMovement_storeId_fkey`,
    DROP FOREIGN KEY `StockMovement_productId_fkey`,
    DROP FOREIGN KEY `StockMovement_userId_fkey`,
    DROP FOREIGN KEY `StockMovement_saleId_fkey`,
    DROP FOREIGN KEY `StockMovement_purchaseId_fkey`;

ALTER TABLE `Customer` DROP FOREIGN KEY `Customer_organizationId_fkey`;

ALTER TABLE `Supplier` DROP FOREIGN KEY `Supplier_organizationId_fkey`;

ALTER TABLE `Sale`
    DROP FOREIGN KEY `Sale_organizationId_fkey`,
    DROP FOREIGN KEY `Sale_storeId_fkey`,
    DROP FOREIGN KEY `Sale_customerId_fkey`,
    DROP FOREIGN KEY `Sale_sellerId_fkey`;

ALTER TABLE `SaleItem`
    DROP FOREIGN KEY `SaleItem_saleId_fkey`,
    DROP FOREIGN KEY `SaleItem_productId_fkey`;

ALTER TABLE `Purchase`
    DROP FOREIGN KEY `Purchase_organizationId_fkey`,
    DROP FOREIGN KEY `Purchase_storeId_fkey`,
    DROP FOREIGN KEY `Purchase_supplierId_fkey`,
    DROP FOREIGN KEY `Purchase_createdById_fkey`;

ALTER TABLE `PurchaseItem`
    DROP FOREIGN KEY `PurchaseItem_purchaseId_fkey`,
    DROP FOREIGN KEY `PurchaseItem_productId_fkey`;

ALTER TABLE `Expense`
    DROP FOREIGN KEY `Expense_organizationId_fkey`,
    DROP FOREIGN KEY `Expense_storeId_fkey`,
    DROP FOREIGN KEY `Expense_createdById_fkey`;

ALTER TABLE `AuditLog`
    DROP FOREIGN KEY `AuditLog_organizationId_fkey`,
    DROP FOREIGN KEY `AuditLog_userId_fkey`;

-- Index créés automatiquement par MariaDB pour les clés étrangères qui
-- n'étaient couvertes par aucun autre index. Ils ne disparaissent pas avec
-- la clé étrangère ; ils seront recréés sous leur nouveau nom à l'étape 4.
ALTER TABLE `Membership` DROP INDEX `Membership_storeId_fkey`;
ALTER TABLE `Product` DROP INDEX `Product_categoryId_fkey`;
ALTER TABLE `StockMovement`
    DROP INDEX `StockMovement_productId_fkey`,
    DROP INDEX `StockMovement_userId_fkey`,
    DROP INDEX `StockMovement_saleId_fkey`,
    DROP INDEX `StockMovement_purchaseId_fkey`;
ALTER TABLE `Sale`
    DROP INDEX `Sale_storeId_fkey`,
    DROP INDEX `Sale_sellerId_fkey`;
ALTER TABLE `SaleItem` DROP INDEX `SaleItem_productId_fkey`;
ALTER TABLE `Purchase`
    DROP INDEX `Purchase_storeId_fkey`,
    DROP INDEX `Purchase_supplierId_fkey`,
    DROP INDEX `Purchase_createdById_fkey`;
ALTER TABLE `PurchaseItem` DROP INDEX `PurchaseItem_productId_fkey`;
ALTER TABLE `Expense`
    DROP INDEX `Expense_storeId_fkey`,
    DROP INDEX `Expense_createdById_fkey`;
ALTER TABLE `AuditLog` DROP INDEX `AuditLog_userId_fkey`;

-- ---------------------------------------------------------------------------
-- 2. Renommage des tables
-- ---------------------------------------------------------------------------

RENAME TABLE
    `User`          TO `Utilisateur`,
    `Organization`  TO `Organisation`,
    `Membership`    TO `Membre`,
    `Store`         TO `Boutique`,
    `Category`      TO `Categorie`,
    `Product`       TO `Produit`,
    `StockMovement` TO `MouvementStock`,
    `Customer`      TO `Client`,
    `Supplier`      TO `Fournisseur`,
    `Sale`          TO `Vente`,
    `SaleItem`      TO `LigneVente`,
    `Purchase`      TO `Achat`,
    `PurchaseItem`  TO `LigneAchat`,
    `Expense`       TO `Depense`,
    `AuditLog`      TO `JournalAudit`;

-- ---------------------------------------------------------------------------
-- 3. Renommage des colonnes et des index
-- ---------------------------------------------------------------------------

-- Utilisateur
ALTER TABLE `Utilisateur`
    CHANGE COLUMN `firstName` `prenom` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `lastName` `nom` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `passwordHash` `motDePasseHash` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Utilisateur`
    DROP INDEX `User_email_key`,
    ADD UNIQUE INDEX `Utilisateur_email_key`(`email`);

-- Organisation
ALTER TABLE `Organisation`
    CHANGE COLUMN `name` `nom` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `currency` `devise` VARCHAR(191) NOT NULL DEFAULT 'XOF',
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Organisation`
    DROP INDEX `Organization_slug_key`,
    ADD UNIQUE INDEX `Organisation_slug_key`(`slug`);

-- Membre
ALTER TABLE `Membre`
    CHANGE COLUMN `userId` `utilisateurId` INTEGER NOT NULL,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `storeId` `boutiqueId` INTEGER NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Membre`
    DROP INDEX `Membership_userId_key`,
    DROP INDEX `Membership_organizationId_idx`,
    ADD UNIQUE INDEX `Membre_utilisateurId_key`(`utilisateurId`),
    ADD INDEX `Membre_organisationId_idx`(`organisationId`);

-- Boutique
ALTER TABLE `Boutique`
    CHANGE COLUMN `name` `nom` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `address` `adresse` VARCHAR(191) NULL,
    CHANGE COLUMN `phone` `telephone` VARCHAR(191) NULL,
    CHANGE COLUMN `isDefault` `parDefaut` BOOLEAN NOT NULL DEFAULT false,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Boutique`
    DROP INDEX `Store_organizationId_idx`,
    ADD INDEX `Boutique_organisationId_idx`(`organisationId`);

-- Categorie
ALTER TABLE `Categorie`
    CHANGE COLUMN `name` `nom` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Categorie`
    DROP INDEX `Category_organizationId_name_key`,
    ADD UNIQUE INDEX `Categorie_organisationId_nom_key`(`organisationId`, `nom`);

-- Produit
ALTER TABLE `Produit`
    CHANGE COLUMN `name` `nom` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `sku` `reference` VARCHAR(191) NULL,
    CHANGE COLUMN `barcode` `codeBarres` VARCHAR(191) NULL,
    CHANGE COLUMN `unit` `unite` VARCHAR(191) NOT NULL DEFAULT 'unité',
    CHANGE COLUMN `purchasePrice` `prixAchat` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `sellingPrice` `prixVente` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `alertThreshold` `seuilAlerte` INTEGER NOT NULL DEFAULT 5,
    CHANGE COLUMN `isActive` `actif` BOOLEAN NOT NULL DEFAULT true,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `categoryId` `categorieId` INTEGER NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Produit`
    DROP INDEX `Product_organizationId_categoryId_idx`,
    DROP INDEX `Product_organizationId_isActive_idx`,
    DROP INDEX `Product_organizationId_sku_key`,
    ADD INDEX `Produit_organisationId_categorieId_idx`(`organisationId`, `categorieId`),
    ADD INDEX `Produit_organisationId_actif_idx`(`organisationId`, `actif`),
    ADD UNIQUE INDEX `Produit_organisationId_reference_key`(`organisationId`, `reference`);

-- Stock
ALTER TABLE `Stock`
    CHANGE COLUMN `quantity` `quantite` INTEGER NOT NULL DEFAULT 0,
    CHANGE COLUMN `storeId` `boutiqueId` INTEGER NOT NULL,
    CHANGE COLUMN `productId` `produitId` INTEGER NOT NULL,
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Stock`
    DROP INDEX `Stock_productId_idx`,
    DROP INDEX `Stock_storeId_productId_key`,
    ADD INDEX `Stock_produitId_idx`(`produitId`),
    ADD UNIQUE INDEX `Stock_boutiqueId_produitId_key`(`boutiqueId`, `produitId`);

-- MouvementStock
ALTER TABLE `MouvementStock`
    CHANGE COLUMN `quantityChange` `variationQuantite` INTEGER NOT NULL,
    CHANGE COLUMN `storeId` `boutiqueId` INTEGER NOT NULL,
    CHANGE COLUMN `productId` `produitId` INTEGER NOT NULL,
    CHANGE COLUMN `userId` `utilisateurId` INTEGER NOT NULL,
    CHANGE COLUMN `saleId` `venteId` INTEGER NULL,
    CHANGE COLUMN `purchaseId` `achatId` INTEGER NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
ALTER TABLE `MouvementStock`
    DROP INDEX `StockMovement_storeId_productId_createdAt_idx`,
    ADD INDEX `MouvementStock_boutiqueId_produitId_creeLe_idx`(`boutiqueId`, `produitId`, `creeLe`);

-- Client
ALTER TABLE `Client`
    CHANGE COLUMN `name` `nom` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `phone` `telephone` VARCHAR(191) NULL,
    CHANGE COLUMN `address` `adresse` VARCHAR(191) NULL,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Client`
    DROP INDEX `Customer_organizationId_idx`,
    ADD INDEX `Client_organisationId_idx`(`organisationId`);

-- Fournisseur
ALTER TABLE `Fournisseur`
    CHANGE COLUMN `name` `nom` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `phone` `telephone` VARCHAR(191) NULL,
    CHANGE COLUMN `address` `adresse` VARCHAR(191) NULL,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `modifieLe` DATETIME(3) NOT NULL;
ALTER TABLE `Fournisseur`
    DROP INDEX `Supplier_organizationId_idx`,
    ADD INDEX `Fournisseur_organisationId_idx`(`organisationId`);

-- Vente
ALTER TABLE `Vente`
    CHANGE COLUMN `status` `statut` ENUM('COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
    CHANGE COLUMN `paymentMethod` `modePaiement` ENUM('CASH', 'CARD', 'MOBILE_MONEY', 'CREDIT', 'OTHER') NOT NULL DEFAULT 'CASH',
    CHANGE COLUMN `subtotal` `sousTotal` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `discount` `remise` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    CHANGE COLUMN `amountPaid` `montantPaye` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `storeId` `boutiqueId` INTEGER NOT NULL,
    CHANGE COLUMN `customerId` `clientId` INTEGER NULL,
    CHANGE COLUMN `sellerId` `vendeurId` INTEGER NOT NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `cancelledAt` `annuleLe` DATETIME(3) NULL;
ALTER TABLE `Vente`
    DROP INDEX `Sale_organizationId_storeId_createdAt_idx`,
    DROP INDEX `Sale_customerId_idx`,
    ADD INDEX `Vente_organisationId_boutiqueId_creeLe_idx`(`organisationId`, `boutiqueId`, `creeLe`),
    ADD INDEX `Vente_clientId_idx`(`clientId`);

-- LigneVente
ALTER TABLE `LigneVente`
    CHANGE COLUMN `quantity` `quantite` INTEGER NOT NULL,
    CHANGE COLUMN `unitPrice` `prixUnitaire` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `unitCost` `coutUnitaire` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `subtotal` `sousTotal` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `saleId` `venteId` INTEGER NOT NULL,
    CHANGE COLUMN `productId` `produitId` INTEGER NOT NULL;
ALTER TABLE `LigneVente`
    DROP INDEX `SaleItem_saleId_productId_key`,
    ADD UNIQUE INDEX `LigneVente_venteId_produitId_key`(`venteId`, `produitId`);

-- Achat
ALTER TABLE `Achat`
    CHANGE COLUMN `status` `statut` ENUM('RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'RECEIVED',
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `storeId` `boutiqueId` INTEGER NOT NULL,
    CHANGE COLUMN `supplierId` `fournisseurId` INTEGER NULL,
    CHANGE COLUMN `createdById` `creeParId` INTEGER NOT NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
ALTER TABLE `Achat`
    DROP INDEX `Purchase_organizationId_storeId_createdAt_idx`,
    ADD INDEX `Achat_organisationId_boutiqueId_creeLe_idx`(`organisationId`, `boutiqueId`, `creeLe`);

-- LigneAchat
ALTER TABLE `LigneAchat`
    CHANGE COLUMN `quantity` `quantite` INTEGER NOT NULL,
    CHANGE COLUMN `unitCost` `coutUnitaire` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `subtotal` `sousTotal` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `purchaseId` `achatId` INTEGER NOT NULL,
    CHANGE COLUMN `productId` `produitId` INTEGER NOT NULL;
ALTER TABLE `LigneAchat`
    DROP INDEX `PurchaseItem_purchaseId_productId_key`,
    ADD UNIQUE INDEX `LigneAchat_achatId_produitId_key`(`achatId`, `produitId`);

-- Depense
ALTER TABLE `Depense`
    CHANGE COLUMN `category` `categorie` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `label` `libelle` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `amount` `montant` DECIMAL(12, 2) NOT NULL,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `storeId` `boutiqueId` INTEGER NULL,
    CHANGE COLUMN `createdById` `creeParId` INTEGER NOT NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
ALTER TABLE `Depense`
    DROP INDEX `Expense_organizationId_date_idx`,
    ADD INDEX `Depense_organisationId_date_idx`(`organisationId`, `date`);

-- JournalAudit
ALTER TABLE `JournalAudit`
    CHANGE COLUMN `entity` `entite` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `entityId` `entiteId` INTEGER NULL,
    CHANGE COLUMN `metadata` `metadonnees` JSON NULL,
    CHANGE COLUMN `organizationId` `organisationId` INTEGER NOT NULL,
    CHANGE COLUMN `userId` `utilisateurId` INTEGER NULL,
    CHANGE COLUMN `createdAt` `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
ALTER TABLE `JournalAudit`
    DROP INDEX `AuditLog_organizationId_createdAt_idx`,
    ADD INDEX `JournalAudit_organisationId_creeLe_idx`(`organisationId`, `creeLe`);

-- ---------------------------------------------------------------------------
-- 4. Recréation des clés étrangères
-- ---------------------------------------------------------------------------

ALTER TABLE `Membre` ADD CONSTRAINT `Membre_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Membre` ADD CONSTRAINT `Membre_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Membre` ADD CONSTRAINT `Membre_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Boutique` ADD CONSTRAINT `Boutique_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Categorie` ADD CONSTRAINT `Categorie_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Produit` ADD CONSTRAINT `Produit_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Produit` ADD CONSTRAINT `Produit_categorieId_fkey` FOREIGN KEY (`categorieId`) REFERENCES `Categorie`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MouvementStock` ADD CONSTRAINT `MouvementStock_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MouvementStock` ADD CONSTRAINT `MouvementStock_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MouvementStock` ADD CONSTRAINT `MouvementStock_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MouvementStock` ADD CONSTRAINT `MouvementStock_venteId_fkey` FOREIGN KEY (`venteId`) REFERENCES `Vente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MouvementStock` ADD CONSTRAINT `MouvementStock_achatId_fkey` FOREIGN KEY (`achatId`) REFERENCES `Achat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Client` ADD CONSTRAINT `Client_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Fournisseur` ADD CONSTRAINT `Fournisseur_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_vendeurId_fkey` FOREIGN KEY (`vendeurId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LigneVente` ADD CONSTRAINT `LigneVente_venteId_fkey` FOREIGN KEY (`venteId`) REFERENCES `Vente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LigneVente` ADD CONSTRAINT `LigneVente_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Achat` ADD CONSTRAINT `Achat_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Achat` ADD CONSTRAINT `Achat_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Achat` ADD CONSTRAINT `Achat_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Achat` ADD CONSTRAINT `Achat_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LigneAchat` ADD CONSTRAINT `LigneAchat_achatId_fkey` FOREIGN KEY (`achatId`) REFERENCES `Achat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LigneAchat` ADD CONSTRAINT `LigneAchat_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Depense` ADD CONSTRAINT `Depense_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Depense` ADD CONSTRAINT `Depense_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Depense` ADD CONSTRAINT `Depense_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `JournalAudit` ADD CONSTRAINT `JournalAudit_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `JournalAudit` ADD CONSTRAINT `JournalAudit_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
