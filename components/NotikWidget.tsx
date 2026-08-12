'use client';

import { useEffect } from 'react';

interface NotikWidgetProps {
  userId: string; 
}

export default function NotikWidget({ userId }: NotikWidgetProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://notik.me/widgets/v1/notik-live-feed.js?v=1.5';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="w-full my-6 p-4 backdrop-blur-xl bg-background/40 border border-white/10 rounded-2xl shadow-lg">
      <notik-live-feed
        api-key="NofGnODVnHB3werypR5PRKx5ew8fTbB4"
        pub-id="Yog41D"
        app-id="psPQDvAS3y"
        user-id={userId}
        layout="grid"
        duration="30d"
        theme="dark"
        primary-color="#117572"
        card-bg="#121212"
        border-color="#262626"
      >
        <p className="text-center text-white/50 animate-pulse">Loading amazing offers...</p>
      </notik-live-feed>
    </div>
  );
}
