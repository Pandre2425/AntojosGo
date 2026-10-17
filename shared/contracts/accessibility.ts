/** Text size options (percent of the base size). The web scales rem units; the app follows Android's font size. */
export const TEXT_SIZES = [
  { id: 'normal', label: 'Normal', percent: 100 },
  { id: 'large', label: 'Grande', percent: 115 },
  { id: 'xlarge', label: 'Muy grande', percent: 130 },
] as const
export type TextSize = (typeof TEXT_SIZES)[number]['id']
export const TEXT_SIZE_KEY = 'antojosgo:text-size'
