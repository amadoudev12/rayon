import { prisma } from "@/lib/prisma";
import { requirePageAuthContext } from "@/lib/auth/session";
import { getActiveStoreId } from "@/lib/auth/store";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TableContainer, Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/format";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MOVEMENT_LABELS } from "@/lib/labels";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function StockMovementsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await requirePageAuthContext();
  const storeId = await getActiveStoreId(context);
  const pagination = getPagination(new URLSearchParams(params as Record<string, string>), 30);

  const where = { boutiqueId: storeId };
  const [movements, total] = await Promise.all([
    prisma.mouvementStock.findMany({
      where,
      include: {
        produit: { select: { id: true, nom: true, unite: true } },
        utilisateur: { select: { prenom: true, nom: true } },
      },
      orderBy: { creeLe: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.mouvementStock.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Historique des mouvements de stock"
        description="Chaque entrée, sortie et ajustement est tracé."
        action={
          <LinkButton href="/stock" variant="secondary">
            <Icon name="arrowLeft" className="h-4 w-4" />
            Retour au stock
          </LinkButton>
        }
      />

      <Card>
        {movements.length === 0 ? (
          <EmptyState icon="history" title="Aucun mouvement" description="Les ventes, achats et ajustements apparaîtront ici." />
        ) : (
          <TableContainer>
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Produit</Th>
                  <Th>Type</Th>
                  <Th className="text-right">Quantité</Th>
                  <Th>Par</Th>
                  <Th>Note</Th>
                </tr>
              </Thead>
              <tbody>
                {movements.map((movement) => {
                  const meta = MOVEMENT_LABELS[movement.type] ?? { label: movement.type, tone: "neutral" as const };
                  return (
                    <Tr key={movement.id}>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(movement.creeLe)}</Td>
                      <Td className="font-medium text-slate-900">{movement.produit.nom}</Td>
                      <Td>
                        <Badge dot tone={meta.tone}>{meta.label}</Badge>
                      </Td>
                      <Td className={`tabular text-right font-medium ${movement.variationQuantite < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {movement.variationQuantite > 0 ? "+" : ""}
                        {movement.variationQuantite} {movement.produit.unite}
                      </Td>
                      <Td>
                        {movement.utilisateur.prenom} {movement.utilisateur.nom}
                      </Td>
                      <Td className="max-w-56 truncate text-slate-500">{movement.note ?? "—"}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableContainer>
        )}

        <Pagination
          basePath="/stock/mouvements"
          searchParams={params}
          page={pagination.page}
          totalPages={paginationMeta(pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
