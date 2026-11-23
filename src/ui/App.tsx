import { useCallback, useState } from 'react';
import { useNav } from './navigation';
import { usePlayer } from './hooks';
import { Nebula } from './components/Nebula';
import { TabBar } from './components/TabBar';
import { MiniPlayer } from './components/MiniPlayer';
import { TrackSheet } from './components/TrackSheet';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PlaylistScreen } from './screens/PlaylistScreen';
import { MoodScreen } from './screens/MoodScreen';
import { PlayerScreen } from './screens/PlayerScreen';

const TAB_SCREENS = { home: HomeScreen, search: SearchScreen, library: LibraryScreen, profile: ProfileScreen };

export function App() {
  const { tab, stack, playerOpen } = useNav();
  const ps = usePlayer();
  const scVisible = playerOpen && !!ps.queue[ps.index]?.embed;
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('nc.splash'));
  const endSplash = useCallback(() => { setSplash(false); try { sessionStorage.setItem('nc.splash', '1'); } catch { /* */ } }, []);

  const page = stack[stack.length - 1];
  const Tab = TAB_SCREENS[tab];
  const content = !page ? <Tab />
    : page.kind === 'mood' ? <MoodScreen key={stack.length} />
    : <PlaylistScreen key={stack.length} page={page} />;

  return (
    <div className="app">
      <Nebula />
      <main>{content}</main>
      <MiniPlayer />
      <TabBar />
      <PlayerScreen />
      {/* официальный плеер SoundCloud: виден в полноэкранном плеере, иначе скрыт */}
      <div id="sc-host" className={scVisible ? 'is-visible' : ''} />
      <TrackSheet />
      {splash && <SplashScreen onDone={endSplash} />}
    </div>
  );
}

