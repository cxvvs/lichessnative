import React from 'react'
import {
  View,
  StyleSheet,
  Animated
} from 'react-native'


interface Props {}

interface State {
  radius: Animated.Value
}

const initialStyle = { width: 0, height: 0, opacity: 0 }

export default class Shadow extends React.Component<Props, State> {
  private shadowRef: View

  constructor(props: Props) {
    super(props)

    this.state = {
      radius: new Animated.Value(0)
    }
  }

  setNativeProps(nativeProps: Object) {
    this.shadowRef.setNativeProps(nativeProps)
  }

  render() {
    return (<Animated.View
      ref={(e: any) => { this.shadowRef = e }}
      style={[ initialStyle, styles.main ]}
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
