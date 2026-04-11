import type { Metadata } from 'next';
import MarketingPage from './MarketingPage';

export const metadata: Metadata = {
  title: 'Styl - Rides That Actually Make Sense',
  description: 'The rideshare platform where drivers keep every dollar they earn. Zero commission, fair rides, honest pay.',
  openGraph: {
    title: 'Styl - Rides That Actually Make Sense',
    description: 'The rideshare platform where drivers keep every dollar they earn. Zero commission, fair rides, honest pay.',
    type: 'website',
  },
};

export default function Page() {
  return <MarketingPage />;
}
