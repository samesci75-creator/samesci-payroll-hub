export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chantiers: {
        Row: {
          id: string
          nom: string
          lieu: string | null
          description: string | null
          statut: string
          created_at: string
        }
        Insert: {
          id?: string
          nom: string
          lieu?: string | null
          description?: string | null
          statut?: string
          created_at?: string
        }
        Update: {
          id?: string
          nom?: string
          lieu?: string | null
          description?: string | null
          statut?: string
          created_at?: string
        }
        Relationships: []
      }
      agent_chantiers: {
        Row: {
          id: string
          personnel_id: string
          chantier: string
          chantier_id: string | null
          numero_affaire: string | null
          montant_journalier_frais: number
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          personnel_id: string
          chantier: string
          chantier_id?: string | null
          numero_affaire?: string | null
          montant_journalier_frais?: number
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          personnel_id?: string
          chantier?: string
          chantier_id?: string | null
          numero_affaire?: string | null
          montant_journalier_frais?: number
          actif?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_chantiers_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_chantiers_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          }
        ]
      }
      paiements: {
        Row: {
          created_at: string
          date_paiement: string
          id: string
          montant: number
          montant_paye?: number
          personnel_id: string
          photo_decharge_url: string | null
          notes?: string | null
          valide_par_dt_id?: string | null
        }
        Insert: {
          created_at?: string
          date_paiement?: string
          id?: string
          montant?: number
          montant_paye?: number
          personnel_id: string
          photo_decharge_url?: string | null
          notes?: string | null
          valide_par_dt_id?: string | null
        }
        Update: {
          created_at?: string
          date_paiement?: string
          id?: string
          montant?: number
          montant_paye?: number
          personnel_id?: string
          photo_decharge_url?: string | null
          notes?: string | null
          valide_par_dt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel: {
        Row: {
          chantier: string
          numero_affaire?: string | null
          created_at: string
          entite: string
          id: string
          matricule: string
          montant_journalier_frais: number
          nom_prenom: string
          photo_profil_url: string | null
          photo_url?: string | null
          telephone: string | null
          type_contrat: string
          actif?: boolean
        }
        Insert: {
          chantier?: string
          numero_affaire?: string | null
          created_at?: string
          entite?: string
          id?: string
          matricule: string
          montant_journalier_frais?: number
          nom_prenom: string
          photo_profil_url?: string | null
          photo_url?: string | null
          telephone?: string | null
          type_contrat?: string
          actif?: boolean
        }
        Update: {
          chantier?: string
          numero_affaire?: string | null
          created_at?: string
          entite?: string
          id?: string
          matricule?: string
          montant_journalier_frais?: number
          nom_prenom?: string
          photo_profil_url?: string | null
          photo_url?: string | null
          telephone?: string | null
          type_contrat?: string
          actif?: boolean
        }
        Relationships: []
      }
      pointages: {
        Row: {
          attendance_type: string
          created_at: string
          date_pointage: string
          id: string
          personnel_id: string
          present: boolean
          valide_par_dt: boolean
          chantier: string | null
          chantier_id: string | null
          montant_calcule: number | null
        }
        Insert: {
          attendance_type?: string
          created_at?: string
          date_pointage: string
          id?: string
          personnel_id: string
          present?: boolean
          valide_par_dt?: boolean
          chantier?: string | null
          chantier_id?: string | null
          montant_calcule?: number | null
        }
        Update: {
          attendance_type?: string
          created_at?: string
          date_pointage?: string
          id?: string
          personnel_id?: string
          present?: boolean
          valide_par_dt?: boolean
          chantier?: string | null
          chantier_id?: string | null
          montant_calcule?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pointages_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pointages_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nom: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          nom?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          chantier_assigne: string | null
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          chantier_assigne?: string | null
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          chantier_assigne?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_personnel: {
        Args: {
          p_matricule: string
          p_nom_prenom: string
          p_type_contrat: string
          p_montant_journalier_frais: number
          p_chantier: string
          p_numero_affaire?: string | null
          p_entite?: string | null
          p_telephone?: string | null
          p_photo_profil_url?: string | null
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "chef_chantier" | "directeur" | "caisse" | "en_attente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "chef_chantier", "directeur", "caisse", "en_attente"],
    },
  },
} as const
