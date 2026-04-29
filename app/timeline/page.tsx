'use client';

import AnnouncementBanner from '../components/AnnouncementBanner';
import MixedFeedSection from './components/MixedFeedSection';

export default function TimelinePage() {
  return (
    <>
      <AnnouncementBanner />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950">
        <div className="px-3 pt-4 pb-24">
          <MixedFeedSection />
        </div>
      </div>
    </>
  );
}
