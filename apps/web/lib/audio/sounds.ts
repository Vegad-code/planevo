export interface FocusSound {
  id: string;
  name: string;
  url: string;
  icon: string;
}

export const FOCUS_SOUNDS: FocusSound[] = [
  {
    id: 'none',
    name: 'Silence',
    url: '',
    icon: '🔇',
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    url: 'https://www.orangefreesounds.com/wp-content/uploads/2014/11/Brown-noise.mp3',
    icon: '🚀',
  },
  {
    id: 'rain',
    name: 'Gentle Rain',
    url: 'https://raw.githubusercontent.com/rafael-almeida/lofi-player/main/public/sounds/rain.mp3',
    icon: '🌧️',
  },
  {
    id: 'lofi',
    name: 'Bruno Beats',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    icon: '🎧',
  }
];
