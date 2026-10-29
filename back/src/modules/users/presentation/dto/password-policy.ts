/**
 * Politique de mot de passe commune (création de compte et changement) :
 * minimum 8 caractères, avec au moins une majuscule, une minuscule,
 * un chiffre et un symbole. Consommée par @IsStrongPassword.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
} as const;

export const PASSWORD_POLICY_MESSAGE =
  'Le mot de passe doit contenir au moins 8 caractères, dont une ' +
  'majuscule, une minuscule, un chiffre et un symbole.';
