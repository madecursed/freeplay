import { useCallback, useState } from 'react';
import { useNav } from './navigation';
import { useUpdateAvailable } from '../update';
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
  const { tab, stack } = useNav();
  const update = useUpdateAvailable();
  const [splash, setSplash] = useState(() => { try { return !sessionStorage.getItem('nc.splash'); } catch { return false; } });
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
      {/* официальный плеер SoundCloud — скрыт; показывается кнопкой «Не играет?» */}
      <div id="sc-host" />
      <TrackSheet />
      {update && <button className="update-pill" onClick={() => location.reload()}>Доступна новая версия · <b>Обновить</b></button>}
      {splash && <SplashScreen onDone={endSplash} />}
    </div>
  );
}
