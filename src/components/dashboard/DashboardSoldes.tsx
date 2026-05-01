import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SoldeRow {
  id: string;
  matricule: string;
  nom_prenom: string;
  chantier: string;
  total_du: number;
  deja_paye: number;
  reste_a_payer: number;
}

interface DashboardSoldesProps {
  soldes: SoldeRow[];
}

export const DashboardSoldes = ({ soldes }: DashboardSoldesProps) => {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg">Soldes du personnel</CardTitle>
      </CardHeader>
      <CardContent>
        {soldes.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Aucune donnée de solde disponible.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-[10px] sm:text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Matricule</th>
                  <th className="pb-3 font-medium">Nom & Prénom</th>
                  <th className="pb-3 font-medium">Chantier</th>
                  <th className="pb-3 font-medium text-right">Total Dû</th>
                  <th className="pb-3 font-medium text-right">Déjà Payé</th>
                  <th className="pb-3 font-medium text-right">Reste à Payer</th>
                </tr>
              </thead>
              <tbody>
                {soldes.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-3 font-mono text-xs">{s.matricule}</td>
                    <td className="py-3 font-medium">{s.nom_prenom}</td>
                    <td className="py-3 text-muted-foreground">{s.chantier}</td>
                    <td className="py-3 text-right">{s.total_du.toLocaleString('fr-FR')} F</td>
                    <td className="py-3 text-right text-success">{s.deja_paye.toLocaleString('fr-FR')} F</td>
                    <td className="py-3 text-right font-semibold">
                      {s.reste_a_payer > 0 ? (
                        <span className="text-warning">{s.reste_a_payer.toLocaleString('fr-FR')} F</span>
                      ) : (
                        <span className="text-success">Soldé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export type { SoldeRow };
