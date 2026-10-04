import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageSuperAdmin } from "@/lib/auth/session";
import { ACTIVITY_KINDS, ACTIVITY_KIND_LABELS, getPlatformActivity, parseActivityQuery } from "@/lib/services/platform";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SelectFilter } from "@/components/ui/SelectFilter";
import { Icon } from "@/components/ui/Icon";
import { ActivityList } from "@/components/admin/parts";

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 25;
const KIND_OPTIONS = ACTIVITY_KINDS.map((kind) => ({ value: kind, label: ACTIVITY_KIND_LABELS[kind] }));
const PAGE_LINK =
  "inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50";

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageSuperAdmin();
  const params = await searchParams;
  const query = parseActivityQuery(new URLSearchParams(params as Record<string, string>));

  const [activity, organization] = await Promise.all([
    getPlatformActivity({ ...query, limit: PAGE_SIZE }),
    query.organizationId
      ? prisma.organisation.findUnique({ where: { id: query.organizationId }, select: { id: true, nom: true } })
      : null,
  ]);

  /** Lien conservant les filtres courants, avec ou sans curseur. */
  function hrefWith(before: Date | null) {
    const next = new URLSearchParams();
    if (query.kind) next.set("kind", query.kind);
    if (query.organizationId) next.set("organizationId", String(query.organizationId));
    if (before) next.set("before", before.toISOString());
    const queryString = next.toString();
    return queryString ? `/admin/activite?${queryString}` : "/admin/activite";
  }

  return (
    <div>
      <PageHeader
        title="Activité"
        description={
          organization
            ? `Événements de la boutique « ${organization.nom} », du plus récent au plus ancien.`
            : "Tous les événements de la plateforme, du plus récent au plus ancien."
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SelectFilter paramName="kind" options={KIND_OPTIONS} placeholder="Tous les événements" />
          {organization && (
            <Link
              href={query.kind ? `/admin/activite?kind=${query.kind}` : "/admin/activite"}
              className="inline-flex items-center gap-1.5 self-start rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200/70 transition-colors hover:bg-brand-100 sm:self-auto"
            >
              {organization.nom}
              <Icon name="x" className="h-3 w-3" />
              <span className="sr-only">Retirer le filtre de boutique</span>
            </Link>
          )}
        </div>

        <ActivityList
          events={activity.events}
          emptyDescription={
            query.before ? "Vous avez atteint le début de l'historique." : "Aucun événement ne correspond à ce filtre."
          }
        />

        {(query.before || activity.nextBefore) && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            {query.before ? (
              <Link href={hrefWith(null)} className={PAGE_LINK}>
                <Icon name="chevronLeft" className="h-3.5 w-3.5" />
                Plus récents
              </Link>
            ) : (
              <span />
            )}
            {activity.nextBefore && (
              <Link href={hrefWith(activity.nextBefore)} className={PAGE_LINK}>
                Plus anciens
                <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </Link>
            )}
          </nav>
        )}
      </Card>
    </div>
  );
}
