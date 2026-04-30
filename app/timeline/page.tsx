'use client';

import AnnouncementBanner from '../components/AnnouncementBanner';
import MixedFeedSection from './components/MixedFeedSection';

export default function TimelinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-100 to-slate-200">
      <AnnouncementBanner />
      <div className="px-0 sm:px-3 pt-4 pb-24">
        <MixedFeedSection />
      </div>
    </div>
  );
}
