import React from 'react';
import { Navigate } from 'react-router-dom';

// MegaRush is the sole public game entry; legacy puzzle data stays intact for rollback.
export const route = {
  path: '/',
  layout: 'public',
  access: 'public'
};

export default function Home() {
  return <Navigate to="/megarush" replace />;
}
