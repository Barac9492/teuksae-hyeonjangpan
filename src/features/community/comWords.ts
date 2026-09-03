export type ComTarget = "circle" | "snack" | "carpool" | "photo";

export interface ComWord {
  id: string;
  prefix: string;
  rest: string;
  korean: string;
  tagline: string;
  origin: string;
  body: string;
  actionLabel: string;
  target: ComTarget;
}

/**
 * community, communion, compassion, communication은 모두 라틴어 com-(함께)에서 시작한다.
 * "우리"를 영어로 풀면 이 네 단어가 된다.
 */
export const COM_WORDS: ComWord[] = [
  {
    id: "community",
    prefix: "com",
    rest: "munity",
    korean: "함께 있음",
    tagline: "같은 새벽, 같은 말씀 앞에",
    origin:
      "라틴어 communis(공동의)에서 왔고, 그 안의 munus는 '선물'과 '맡은 일'을 함께 뜻합니다. 공동체란 서로에게 선물이 되는 사람들입니다.",
    body: "송림 본당이든, 드림센터든, 체육관이든, 병실의 이어폰이든. 오늘 같은 시간에 같은 말씀을 듣는 사람이 모두 '우리'입니다. 어디에 앉았는지는 등급이 아닙니다.",
    actionLabel: "우리의 원 보기",
    target: "circle",
  },
  {
    id: "communion",
    prefix: "com",
    rest: "munion",
    korean: "함께 나눔",
    tagline: "떡을 떼며",
    origin:
      "같은 뿌리에서 나온 말로, 성찬을 뜻하기도 합니다. 함께 먹는 일은 오래전부터 예배의 일부였습니다.",
    body: "특새 간식은 상품이 아니라 가족의 기억입니다. 새벽에 건네받은 떡 한 조각, 따뜻한 두유 한 병이 20년 뒤에도 남습니다.",
    actionLabel: "간식 나누기",
    target: "snack",
  },
  {
    id: "compassion",
    prefix: "com",
    rest: "passion",
    korean: "함께 아파함",
    tagline: "네 짐을 내 차에",
    origin:
      "com(함께) + pati(겪다). 남의 고통을 함께 겪는다는 뜻입니다. 새벽 세 시에 남의 집 앞에 차를 세우는 일이 그렇습니다.",
    body: "운전이 어려운 어르신, 아이 셋을 깨워 나오는 가정, 차가 없는 청년. 빈자리 하나가 누군가에게는 특새 전체입니다.",
    actionLabel: "카풀 같이 타요",
    target: "carpool",
  },
  {
    id: "communication",
    prefix: "com",
    rest: "munication",
    korean: "함께 알림",
    tagline: "같은 새벽을 남기기",
    origin:
      "communicare, '공동의 것으로 만들다'. 소식을 전하는 일은 내가 본 것을 우리의 것으로 만드는 일입니다.",
    body: "문이 열리는 순간, 안내팀의 뒷모습, 아직 어두운 주차장. 얼굴과 이름을 지운 장면들이 오지 못한 사람에게도 새벽을 건넵니다.",
    actionLabel: "사진 나누기",
    target: "photo",
  },
];
