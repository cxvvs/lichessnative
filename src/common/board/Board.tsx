import React from 'react'
import {
  StyleSheet,
  View,
  ViewStyle,
  LayoutChangeEvent,
  LayoutRectangle,
  PanResponder,
  PanResponderInstance,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native'

import PieceEl from './Piece'
import SquareLight from './SquareLight'
import Background from './Background'
import * as util from './util'
import { BoardPiece, BoardPieces, Key } from './types'
import { BoardConfig } from './config'
import { BoardState } from './state'
import Shadow from './Shadow'

export interface BoardHandlers {
  onSelectSquare: (k: Key | null) => void
  onMove: (orig: Key, dest: Key, animate?: boolean) => void
}

interface Props {
  size: number
  sqSize: number
  state: BoardState
  handlers: BoardHandlers
  config: BoardConfig
}

// const MOVE_THRESHOLD = 2

export default class Board extends React.PureComponent<Props, void> {
  private layout: LayoutRectangle
  private panResponder: PanResponderInstance

  // board key that is currently overflown by a piece during drag
  // null if out of bounds or no piece currently dragged
  private dragOver: Key | null

  // re-select square means de-select so we keep track of the previously
  // selected square
  private previouslySelected: Key | null

  // ref to the dragging piece
  private draggingPiece: PieceEl | null
  // ref to the shadow view element
  private shadow?: Shadow

  constructor(props: Props) {
    super(props)

    this.dragOver = null
    this.draggingPiece = null
    this.previouslySelected = null

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: this.handlePanResponderGrant,
      onPanResponderMove: this.handlePanResponderMove,
      onPanResponderRelease: this.handlePanResponderRelease,
      onPanResponderTerminate: this.handlePanResponderTerminate
    })
  }

  render() {
    const { size, sqSize } = this.props
    const { pieces, selected } = this.props.state
    return (
      <View
        style={[styles.container, { width: size, height: size }]}
        onLayout={this.onLayout}
        {...this.panResponder.panHandlers}
      >
        <Background size={size} darkColor="#83ACBD" lightColor="#F3FAFF" />
        <Shadow
          ref = { (r: any) => this.shadow = r }
          size = { sqSize * 2 }
        />
        { selected !== null ?
          <SquareLight light="selected" size={sqSize} boardKey={selected} /> :
          null
        }
        <View
          style={[styles.innerContainer, { width: size, height: size }]}
        >
          {this.renderPieces(pieces, sqSize)}
        </View>
      </View>
    )
  }

  renderPieces(pieces: BoardPieces, sqSize: number) {
    const anims = this.props.state.animatePieces
    const dg = this.draggingPiece
    const ks = Object.keys(pieces)
    const staticPieces: JSX.Element[] = []
    const animatedPieces: JSX.Element[] = []
    const interactedPiece: JSX.Element[] = []
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i] as Key
      const p = pieces[k]
      if (p !== undefined) {
        const el = this.renderPiece(k, p, sqSize)
        if (anims !== undefined && anims.has(k)) animatedPieces.push(el)
        else if (dg !== null && dg.props.boardKey === k) interactedPiece.push(el)
        else staticPieces.push(el)
      }
    }
    // ensure moving pieces are rendered after static ones to emulate zIndex
    return staticPieces.concat(animatedPieces).concat(interactedPiece)
  }

  renderPiece(key: Key, piece: BoardPiece, size: number) {
    const anims = this.props.state.animatePieces
    return (
      <PieceEl
        key={piece.id}
        boardKey={key}
        size={size}
        theme="cburnett"
        role={piece.role}
        color={piece.color}
        animate={anims !== undefined ? anims.has(key) : undefined}
        ref={key}
      />
    )
  }

  private onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    this.layout = nativeEvent.layout
  }

  private handlePanResponderGrant = (_: GestureResponderEvent, gesture: PanResponderGestureState) => {
    const key = util.getKeyFromGrantEvent(gesture, this.layout)
    if (key !== null) {
      const sel = this.props.state.selected
      const orig = sel !== null && this.props.state.pieces[sel]
      if (orig !== undefined && sel !== null && sel !== key) {
        this.props.handlers.onMove(sel, key)
      }
      if (this.props.state.pieces[key] !== undefined) {
        const p = this.refs[key]
        this.previouslySelected = sel
        this.props.handlers.onSelectSquare(key)
        // when this.draggingPiece is not null means dragging has started
        // we force update to put it at the end of the rendered stack
        if (p) {
          this.draggingPiece = p as PieceEl
          this.forceUpdate()
        }

        // copy pasted curentShadow transform. TODO : Remove it
        const { sqSize } = this.props
        const posAux = util.key2Pos(key, sqSize)
        const pos = { x: posAux.x - sqSize / 2,  y: posAux.y - sqSize / 2 }
        if (this.shadow) {
          this.shadow.openShadow(pos.x, pos.y)
        }
      }
    }
  }

  private handlePanResponderMove = (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const { sqSize } = this.props
    if (this.draggingPiece) {
      this.draggingPiece.setNativeProps({
        style: {
          transform: [{ translate: [
            gestureState.moveX - this.layout.x - (sqSize / 2),
            gestureState.moveY - this.layout.y - sqSize
          ]}, {scale: 2}]
        }
      })

      const prevKey = this.dragOver
      this.dragOver = util.getKeyFromMoveEvent(gestureState, this.layout)
      if (this.shadow && prevKey !== this.dragOver) {
        const pos = this.getCurrentShadowTransform()
        if (pos !== undefined) {
          this.shadow.moveTo(pos.x, pos.y)
        }
      }
    }
  }

  private handlePanResponderRelease = (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const orig = this.props.state.selected
    const dest = this.dragOver
    this.dragOver = null
    this.removeShadow()
    if (this.draggingPiece && orig) {
      // TODO threshold
      const hasMoved = gestureState.dx !== 0 || gestureState.dy !== 0
      if (dest === null) {
        this.cancelDrag()
      } else if (orig !== dest) {
        const pos = util.key2Pos(dest, this.props.size / 8)
        this.draggingPiece.setNativeProps({
          style: {
            transform: [{ translate: [ pos.x, pos.y ]}]
          }
        })
        requestAnimationFrame(() => this.props.handlers.onMove(orig, dest, false))
      } else {
        this.cancelDrag()
      }
      if (this.previouslySelected === orig && !hasMoved) {
        this.props.handlers.onSelectSquare(null)
      }
    } else {
      this.cancelDrag()
    }

    this.removeShadow()
  }

  private handlePanResponderTerminate = () => {
    this.removeShadow()
    this.cancelDrag()
  }

  private removeShadow() {
    if (this.shadow) {
      this.shadow.hide()
    }
  }

  private cancelDrag() {
    const { sqSize } = this.props
    if (this.draggingPiece) {
      const pos = util.key2Pos(this.draggingPiece.props.boardKey, sqSize)
      this.draggingPiece.setNativeProps({
        style: {
          transform: [{ translate: [ pos.x, pos.y ]}]
        }
      })
      this.draggingPiece = null
    }
  }

  private getCurrentShadowTransform() {
    const { sqSize } = this.props
    const pos = this.dragOver !== null
      ? util.key2Pos(this.dragOver, sqSize)
      : null
    return pos != null ? { x: pos.x - sqSize / 2,  y: pos.y - sqSize / 2 } : undefined
  }
}

interface Style {
  container: ViewStyle
  innerContainer: ViewStyle
  shadow: ViewStyle
}

const styles = StyleSheet.create<Style>({
  container: {
    width: 200,
    height: 200,
  },
  innerContainer: {
    position: 'absolute',
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 50
  }
})