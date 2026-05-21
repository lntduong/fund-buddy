import { getMembersData, getActivitiesData, getTransactionsData } from '../actions';
import ActivitiesClient from '../../components/ActivitiesClient';

export const revalidate = 0; // Force SSR

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const isAdd = resolvedSearchParams.add === 'true';

  const [members, activities, transactions] = await Promise.all([
    getMembersData(),
    getActivitiesData(),
    getTransactionsData(),
  ]);

  return (
    <ActivitiesClient
      initialMembers={members}
      initialActivities={activities}
      initialTransactions={transactions}
      openAddByDefault={isAdd}
    />
  );
}
