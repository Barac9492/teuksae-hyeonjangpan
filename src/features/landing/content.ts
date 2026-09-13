import worshipPhoto from '../../assets/landing/worship.jpg';
import familyPhoto from '../../assets/landing/family.jpg';

/** Replace draft content here after the church confirms the event details. */
export const eventContent = {
  name: '특별새벽부흥회',
  headline: '하나님 앞에, 함께.',
  schedule: '행사 일정 · 추후 안내',
  verse: ['그리스도 예수 안에서', '함께 지어져 가느니라'],
  verseReference: '에베소서 2:22 · 묵상 예시',
} as const;

export const scenes = [
  { id: 'church', button: '예배당에서', image: worshipPhoto,
    alt: '분당우리교회 예배당에서 여러 세대의 성도들이 함께 찬양하는 모습',
    caption: '예배당에서 드리는 우리', width: 1000, height: 667 },
  { id: 'home', button: '가정에서', image: familyPhoto,
    alt: '가정에서 성경을 함께 읽는 어머니와 두 자녀의 참고 사진',
    caption: '가정에서 드리는 우리 · 참고 사진', width: 640, height: 474 },
] as const;

export type PlaceId = 'songlim' | 'dream' | 'online';
export interface WorshipPlace {
  label: string;
  title: string;
  description: string;
  facts: readonly { label: string; value: string }[];
  action: string;
  guidance: readonly string[];
}

export const places: Record<PlaceId, WorshipPlace> = {
  songlim: {
    label: '송림본당', title: '송림본당에서 만나요.',
    description: '함께 찬양하고, 같은 말씀을 듣는 자리.',
    facts: [{ label: '예배 시간', value: '추후 안내' }, { label: '주차 · 출입구', value: '공식 안내 준비 중' }],
    action: '오시기 전에 확인해주세요',
    guidance: ['성경과 필기도구를 준비해주세요.', '출입구, 주차, 아이 동반 예배 공간은 공식 안내가 확정되면 확인하실 수 있습니다.'],
  },
  dream: {
    label: '드림센터', title: '드림센터에서 만나요.',
    description: '서로의 곁에서, 우리 함께 예배합니다.',
    facts: [{ label: '예배 시간', value: '추후 안내' }, { label: '예배실 · 주차', value: '공식 안내 준비 중' }],
    action: '오시기 전에 확인해주세요',
    guidance: ['성경과 필기도구를 준비해주세요.', '예배실, 주차, 아이 동반 예배 공간은 공식 안내가 확정되면 확인하실 수 있습니다.'],
  },
  online: {
    label: '온라인', title: '어디에 계시든, 우리.',
    description: '각자의 자리에서 같은 말씀으로 예배합니다.',
    facts: [{ label: '생방송 시간', value: '추후 안내' }, { label: '준비물', value: '성경과 조용한 자리' }],
    action: '온라인 예배 준비하기',
    guidance: ['성경을 펴고, 잠시 조용히 마음을 준비해주세요.', '하나님, 서로 다른 자리에 있는 우리가 같은 말씀 안에서 함께 예배하게 해주세요.'],
  },
};

export const placeOrder: readonly PlaceId[] = ['songlim', 'dream', 'online'];
export const photoSources = {
  worship: 'https://www.woorichurch.org/modu/s_board/read.asp?board_seq=78&board_sub_seq=1&lef=&page=&seq=424110&typ=&word=',
  family: 'https://www.kmib.co.kr/article/view.asp?arcid=0924169047',
} as const;
