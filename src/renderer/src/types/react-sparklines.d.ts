declare module 'react-sparklines' {
  import { Component, CSSProperties, ReactNode } from 'react'

  interface SparklinesProps {
    data?: number[]
    limit?: number
    width?: number
    height?: number
    margin?: number
    min?: number
    max?: number
    style?: CSSProperties
    children?: ReactNode
  }

  export class Sparklines extends Component<SparklinesProps> {}
  export class SparklinesLine extends Component<{ style?: CSSProperties; color?: string }> {}
  export class SparklinesBars extends Component<{ style?: CSSProperties; barWidth?: number }> {}
  export class SparklinesReferenceLine extends Component<{ type?: 'max' | 'min' | 'mean' | 'avg' | 'median' | 'custom'; value?: number; style?: CSSProperties }> {}
  export class SparklinesCurve extends Component<{ style?: CSSProperties; color?: string }> {}
  export class SparklinesNormalBand extends Component<{ style?: CSSProperties }> {}
}
