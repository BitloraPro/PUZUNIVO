import React from 'react';
import { Navigate } from 'react-router-dom';

// Redirect old puzzle catalog visits to the user's selected 3D reference game.
export const route = {
  path: '/games',
  layout: 'public',
  access: 'public'
};

export default function Games() {
  return <Navigate to="/megarush" replace />;
}
