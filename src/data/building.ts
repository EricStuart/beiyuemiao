export type EvidenceLevel = 'documented' | 'secondary' | 'inferred';

export interface SourcedNumber {
  value: number;
  unit: 'm' | 'm2';
  evidence: EvidenceLevel;
  note: string;
}

export interface SourceLink {
  label: string;
  url: string;
  kind: EvidenceLevel | 'reference';
}

export interface BuildingData {
  name: string;
  location: string;
  facadeBays: number;
  depthBays: number;
  bayWidths: readonly number[];
  depthWidths: readonly number[];
  totalHeight: SourcedNumber;
  footprintArea: SourcedNumber;
  planWidth: SourcedNumber;
  planDepth: SourcedNumber;
  corridorColumnHeight: SourcedNumber;
  upperColumnHeight: SourcedNumber;
  platformHeight: number;
  lowerEaveHeight: number;
  upperEaveHeight: number;
  upperRidgeHeight: number;
  palette: {
    timber: number;
    darkTimber: number;
    paintedGreen: number;
    tileGrey: number;
    glazedGreen: number;
    stone: number;
    brick: number;
  };
  sources: readonly SourceLink[];
}

export const DENING_HALL: BuildingData = {
  name: '德宁之殿',
  location: '河北省保定市曲阳县北岳庙',
  facadeBays: 9,
  depthBays: 6,
  bayWidths: [0.78, 0.9, 1, 1.08, 1.16, 1.08, 1, 0.9, 0.78],
  depthWidths: [0.82, 1, 1.08, 1.08, 1, 0.82],
  totalHeight: {
    value: 25.6,
    unit: 'm',
    evidence: 'documented',
    note: '曲阳县公开文物资料公布值',
  },
  footprintArea: {
    value: 2009.8,
    unit: 'm2',
    evidence: 'documented',
    note: '公开资料所称占地面积，口径可能包含出檐或台基',
  },
  planWidth: {
    value: 52.8,
    unit: 'm',
    evidence: 'inferred',
    note: '由占地信息、正立面照片和九间柱网权重拟合，非实测',
  },
  planDepth: {
    value: 38.06,
    unit: 'm',
    evidence: 'inferred',
    note: '由占地信息、侧向照片和六进柱网权重拟合，非实测',
  },
  corridorColumnHeight: {
    value: 4.89,
    unit: 'm',
    evidence: 'secondary',
    note: '建筑研究资料转引值',
  },
  upperColumnHeight: {
    value: 9.96,
    unit: 'm',
    evidence: 'secondary',
    note: '建筑研究资料转引值',
  },
  platformHeight: 2.15,
  lowerEaveHeight: 9.25,
  upperEaveHeight: 17.15,
  upperRidgeHeight: 25.6,
  palette: {
    timber: 0x63362c,
    darkTimber: 0x352823,
    paintedGreen: 0x355849,
    tileGrey: 0x4d554f,
    glazedGreen: 0x255942,
    stone: 0xaaa491,
    brick: 0x625f55,
  },
  sources: [
    {
      label: '曲阳县人民政府 · 北岳庙',
      url: 'https://www.quyang.gov.cn/d/fangzhiquyang/4083.html',
      kind: 'documented',
    },
    {
      label: '曲阳县文化馆 · 文博曲阳',
      url: 'https://www.qyxwhg.com.cn/nd.jsp?id=8',
      kind: 'documented',
    },
    {
      label: '曲阳北岳庙博物馆',
      url: 'https://www.beiyuemiao.cn/col.jsp?id=114',
      kind: 'documented',
    },
    {
      label: 'Wikimedia Commons · 德宁之殿 2020',
      url: 'https://commons.wikimedia.org/wiki/File:%E6%9B%B2%E9%98%B3%E5%8C%97%E5%B2%B3%E5%BA%99%E5%BE%B7%E5%AE%81%E4%B9%8B%E6%AE%BF2020.jpg',
      kind: 'reference',
    },
    {
      label: '用户提供正面照片',
      url: '/reference/dening-hall-front.jpg',
      kind: 'reference',
    },
  ],
};
