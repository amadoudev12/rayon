import { prisma } from "@/lib/prisma";
import { requirePageAuthContext, requirePermission } from "@/lib/auth/session";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { ExpensesTable } from "./ExpensesTable";
import { NewExpenseButton } from "./NewExpenseButton";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await requirePageAuthContext();
  requirePermission(context, "expense:manage");
  const pagination = getPagination(new URLSearchParams(params as Record<string, string>), 20);

  const where = { organisationId: context.organizationId };

  const [expenses, total, organization] = await Promise.all([
    prisma.depense.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.depense.count({ where }),
    prisma.organisation.findUniqueOrThrow({ where: { id: context.organizationId }, select: { devise: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Dépenses" description="Suivez les charges de votre activité." action={<NewExpenseButton />} />

      <Card>
        <ExpensesTable
          expenses={expenses.map((expense) => ({ ...expense, montant: Number(expense.montant) }))}
          currency={organization.devise}
        />

        <Pagination
          basePath="/depenses"
          searchParams={params}
          page={pagination.page}
          totalPages={paginationMeta(pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
