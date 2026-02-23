'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudioHome() {
  const router = useRouter();

  // Redirect to create page on component mount
  useEffect(() => {
    router.push('/studio/create');
  }, [router]);

  return null; // This component will redirect, so no need to render anything
} 