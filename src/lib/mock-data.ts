export interface Personnel {
  id: string;
  matricule: string;
  nom_prenom: string;
  type_contrat: 'journalier' | 'mensuel';
  montant_journalier_frais: number;
  chantier: string;
  telephone?: string;
  created_at: string;
}

export interface Pointage {
  id: string;
  personnel_id: string;
  date_pointage: string;
  present: boolean;
  valide_par_dt: boolean;
  created_at: string;
}

export interface Paiement {
  id: string;
  personnel_id: string;
  montant: number;
  date_paiement: string;
  photo_decharge_url?: string;
  created_at: string;
}

export interface SoldePersonnel {
  id: string;
  matricule: string;
  nom_prenom: string;
  type_contrat: string;
  chantier: string;
  montant_journalier_frais: number;
  jours_pointes: number;
  jours_valides: number;
  total_du: number;
  deja_paye: number;
  reste_a_payer: number;
}

export const mockPersonnel: Personnel[] = [
  { id: '1', matricule: 'SAM-001', nom_prenom: 'Kouassi Yao Bernard', type_contrat: 'journalier', montant_journalier_frais: 5000, chantier: 'Chantier Plateau', telephone: '0708001122', created_at: '2025-01-15' },
  { id: '2', matricule: 'SAM-002', nom_prenom: 'Traoré Aminata', type_contrat: 'journalier', montant_journalier_frais: 6000, chantier: 'Chantier Plateau', telephone: '0509112233', created_at: '2025-01-15' },
  { id: '3', matricule: 'SAM-003', nom_prenom: 'Koné Ibrahim', type_contrat: 'mensuel', montant_journalier_frais: 7500, chantier: 'Chantier Cocody', telephone: '0101223344', created_at: '2025-02-01' },
  { id: '4', matricule: 'SAM-004', nom_prenom: 'Bamba Sékou', type_contrat: 'journalier', montant_journalier_frais: 5000, chantier: 'Chantier Cocody', telephone: '0707334455', created_at: '2025-02-01' },
  { id: '5', matricule: 'SAM-005', nom_prenom: 'Coulibaly Mariam', type_contrat: 'journalier', montant_journalier_frais: 5500, chantier: 'Chantier Yopougon', telephone: '0508445566', created_at: '2025-02-10' },
  { id: '6', matricule: 'SAM-006', nom_prenom: 'Diallo Ousmane', type_contrat: 'mensuel', montant_journalier_frais: 8000, chantier: 'Chantier Yopougon', telephone: '0102556677', created_at: '2025-02-10' },
];

export const mockPointages: Pointage[] = [
  { id: '1', personnel_id: '1', date_pointage: '2025-03-01', present: true, valide_par_dt: true, created_at: '2025-03-01' },
  { id: '2', personnel_id: '2', date_pointage: '2025-03-01', present: true, valide_par_dt: true, created_at: '2025-03-01' },
  { id: '3', personnel_id: '3', date_pointage: '2025-03-01', present: true, valide_par_dt: false, created_at: '2025-03-01' },
  { id: '4', personnel_id: '4', date_pointage: '2025-03-01', present: false, valide_par_dt: false, created_at: '2025-03-01' },
  { id: '5', personnel_id: '1', date_pointage: '2025-03-02', present: true, valide_par_dt: true, created_at: '2025-03-02' },
  { id: '6', personnel_id: '2', date_pointage: '2025-03-02', present: true, valide_par_dt: false, created_at: '2025-03-02' },
  { id: '7', personnel_id: '5', date_pointage: '2025-03-01', present: true, valide_par_dt: true, created_at: '2025-03-01' },
  { id: '8', personnel_id: '6', date_pointage: '2025-03-01', present: true, valide_par_dt: true, created_at: '2025-03-01' },
];

export const mockPaiements: Paiement[] = [
  { id: '1', personnel_id: '1', montant: 5000, date_paiement: '2025-03-03', created_at: '2025-03-03' },
  { id: '2', personnel_id: '5', montant: 5500, date_paiement: '2025-03-03', created_at: '2025-03-03' },
];

export const mockSoldes: SoldePersonnel[] = [
  { id: '1', matricule: 'SAM-001', nom_prenom: 'Kouassi Yao Bernard', type_contrat: 'journalier', chantier: 'Chantier Plateau', montant_journalier_frais: 5000, jours_pointes: 2, jours_valides: 2, total_du: 10000, deja_paye: 5000, reste_a_payer: 5000 },
  { id: '2', matricule: 'SAM-002', nom_prenom: 'Traoré Aminata', type_contrat: 'journalier', chantier: 'Chantier Plateau', montant_journalier_frais: 6000, jours_pointes: 2, jours_valides: 1, total_du: 6000, deja_paye: 0, reste_a_payer: 6000 },
  { id: '3', matricule: 'SAM-003', nom_prenom: 'Koné Ibrahim', type_contrat: 'mensuel', chantier: 'Chantier Cocody', montant_journalier_frais: 7500, jours_pointes: 1, jours_valides: 0, total_du: 0, deja_paye: 0, reste_a_payer: 0 },
  { id: '4', matricule: 'SAM-004', nom_prenom: 'Bamba Sékou', type_contrat: 'journalier', chantier: 'Chantier Cocody', montant_journalier_frais: 5000, jours_pointes: 0, jours_valides: 0, total_du: 0, deja_paye: 0, reste_a_payer: 0 },
  { id: '5', matricule: 'SAM-005', nom_prenom: 'Coulibaly Mariam', type_contrat: 'journalier', chantier: 'Chantier Yopougon', montant_journalier_frais: 5500, jours_pointes: 1, jours_valides: 1, total_du: 5500, deja_paye: 5500, reste_a_payer: 0 },
  { id: '6', matricule: 'SAM-006', nom_prenom: 'Diallo Ousmane', type_contrat: 'mensuel', chantier: 'Chantier Yopougon', montant_journalier_frais: 8000, jours_pointes: 1, jours_valides: 1, total_du: 8000, deja_paye: 0, reste_a_payer: 8000 },
];

export type UserRole = 'admin' | 'chef_chantier' | 'directeur' | 'caisse';

export interface MockUser {
  id: string;
  email: string;
  nom: string;
  role: UserRole;
}

export const mockUsers: MockUser[] = [
  { id: '1', email: 'admin@sames.ci', nom: 'Admin RH', role: 'admin' },
  { id: '2', email: 'chef@sames.ci', nom: 'Chef Plateau', role: 'chef_chantier' },
  { id: '3', email: 'directeur@sames.ci', nom: 'Directeur Travaux', role: 'directeur' },
  { id: '4', email: 'caisse@sames.ci', nom: 'Caissier', role: 'caisse' },
];
