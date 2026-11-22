import { useEffect, useState } from 'react';

/** Tiny hash router: "#/workouts/new?program=x&day=0" -> { path: ['workouts','new'], query }. */
export interface Route { path: string[]; query: URLSearchParams }

function parse(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [p, q = ''] = raw.split('?');
  return { path: p ? p.split('/') : [], query: new URLSearchParams(q) };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const navigate = (to: string) => { location.hash = to; };
