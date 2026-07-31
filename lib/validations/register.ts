import { z } from "zod";

export const registerSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(1, "Le nom est obligatoire.")
    .min(2, "Le nom doit contenir au moins 2 caractères."),
  prenom: z
    .string()
    .trim()
    .min(1, "Le prénom est obligatoire.")
    .min(2, "Le prénom doit contenir au moins 2 caractères."),
  adresse: z
    .string()
    .trim()
    .min(1, "L'adresse est obligatoire.")
    .min(5, "L'adresse doit contenir au moins 5 caractères."),
  email: z
    .string()
    .trim()
    .min(1, "L'email est obligatoire.")
    .email("Adresse email invalide."),
  password: z
    .string()
    .min(1, "Le mot de passe est obligatoire.")
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre."),
});

export type RegisterFormData = z.infer<typeof registerSchema>;