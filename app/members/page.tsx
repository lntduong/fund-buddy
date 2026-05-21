import { getMembersData, getTransactionsData, getActivitiesData } from '../actions';
import MembersClient from '../../components/MembersClient';

export const revalidate = 0; // Force SSR

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MembersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const isContribution = resolvedSearchParams.contribution === 'true';

  const [members, transactions, activities] = await Promise.all([
    getMembersData(),
    getTransactionsData(),
    getActivitiesData(),
  ]);

  return (
    <MembersClient
      initialMembers={members}
      initialTransactions={transactions}
      initialActivities={activities}
      openContributionByDefault={isContribution}
    />
  );
}

