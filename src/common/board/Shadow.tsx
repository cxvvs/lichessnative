import React from 'react'
import {
  View,
  StyleSheet,
  Animated
} from 'react-native'


interface Props {
  size: number
}

interface State {
  scale: Animated.Value
  x: Animated.Value
  y: Animated.Value
}

const translationDuration = 48 // ms

const initialStyle = { width: 0, height: 0, opacity: 0 }

export default class Shadow extends React.Component<Props, State> {
  private shadowRef: View

  constructor(props: Props) {
    super(props)

    this.state = {
      scale: new Animated.Value(0),
      x: new Animated.Value(0),
      y: new Animated.Value(0)
    }
  }

  setNativeProps(nativeProps: Object) {
    this.shadowRef.setNativeProps(nativeProps)
  }

  openShadow(x: number, y: number) {
    Animated.parallel([
      Animated.timing(
        this.state.scale,
        {
          toValue: 1,
          duration: 150
        }
      ),
      Animated.timing( this.state.x, { toValue: x, duration: translationDuration } ),
      Animated.timing( this.state.y, { toValue: y, duration: translationDuration } ),
    ]).start()
    this.setNativeProps({ style : { opacity: 1 } })
  }

  moveTo(x: number, y: number) {
    Animated.parallel([
      Animated.timing( this.state.x, { toValue: x, duration: translationDuration } ),
      Animated.timing( this.state.y, { toValue: y, duration: translationDuration } ),
    ]).start()
  }

  hide() {
    Animated.timing(
      this.state.scale,
      {
        toValue: 0,
        duration: 200
      }
    ).start()
  }

  render() {
    const { size } = this.props
    const { scale, x, y } = this.state

    return (<Animated.View
      ref={(e: any) => { this.shadowRef = e }}
      style={[ initialStyle, styles.main,
        { width: size, height: size, transform: [ { translateX: x }, { translateY: y }, { scale } ] }
      ]}
    />)
  }

}

const styles = StyleSheet.create({
  main: {
    position: 'absolute',
    backgroundColor: 'rgba(2,4,0,0.2)',
    borderRadius: 50
  }
})
