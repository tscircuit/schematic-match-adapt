import type { CircuitBuilder } from "./CircuitBuilder/CircuitBuilder"
import { Grid } from "./Grid"

export const getGridFromCircuit = (
  circuit: CircuitBuilder,
  opts: {
    chipLabels?: boolean
    showAxisLabels?: boolean
    gridScaleX?: number
    gridScaleY?: number
  } = {},
): Grid => {
  opts.chipLabels ??= true
  opts.showAxisLabels ??= false
  opts.gridScaleX ??= 1
  opts.gridScaleY ??= 1

  const gridScaleX = opts.gridScaleX!
  const gridScaleY = opts.gridScaleY!
  const cellWidth = 1 / gridScaleX
  const cellHeight = 1 / gridScaleY

  const g = new Grid({
    showAxisLabels: opts.showAxisLabels,
    gridScaleX,
    gridScaleY,
  })
  // Store passive info for later rendering
  const passives = []

  // 1. Draw every chip
  for (const chip of circuit.chips) {
    if (chip.isPassive) {
      // Store passive for later rendering after traces
      passives.push(chip)
      continue
    }
    // Use actual chip dimensions
    const chipWidth = chip.getWidth()
    const chipHeight = chip.getHeight()
    // Convert chip height to grid rows - scale the height and add borders
    const chipRowHeight = Math.round(chipHeight * opts.gridScaleY!)

    if (opts.chipLabels && chip.topPinCount === 0) {
      const labelY = chip.y + chip.getHeight()
      const labelText = chip.chipId

      for (let x = chip.x, i = 0; i < labelText.length; i++, x += cellWidth) {
        g.putOverlay(x, labelY, labelText[i]!)
      }
    }

    // Convert chip position to grid coordinates
    const chipGridX = Math.round(chip.x * opts.gridScaleX!)
    const chipGridY = Math.round(chip.y * opts.gridScaleY!)

    for (let r = 0; r < chipRowHeight; ++r) {
      // r is visual row index from bottom (0) to top (height-1)
      let mid0 = " "
      let mid1 = " "
      let mid2 = " "

      const isBottomBorder = r === 0
      const isTopBorder = r === chipRowHeight - 1

      const midWidth = chipWidth * opts.gridScaleX!

      if (isBottomBorder) {
        mid0 = "└"
        mid1 = "─".repeat(midWidth) // TODO: Add bottom pins display if any
        mid2 = "┘"
      } else if (isTopBorder) {
        mid0 = "┌"
        mid1 = "─".repeat(midWidth) // TODO: Add top pins display if any
        mid2 = "┐"
      } else {
        // Pin rows - check if any pins are at this grid row
        const currentGridY = chipGridY + r
        let leftPinData: any = undefined
        let rightPinData: any = undefined

        // Check left pins
        for (const pin of chip.leftPins) {
          const pinLoc = chip.getPinLocation(pin.pinNumber)
          const pinGridY = Math.round(pinLoc.y * opts.gridScaleY!)
          if (pinGridY === currentGridY) {
            leftPinData = pin
            break
          }
        }

        // Check right pins
        for (const pin of chip.rightPins) {
          const pinLoc = chip.getPinLocation(pin.pinNumber)
          const pinGridY = Math.round(pinLoc.y * opts.gridScaleY!)
          if (pinGridY === currentGridY) {
            rightPinData = pin
            break
          }
        }

        mid0 = leftPinData ? "┤" : "│"
        mid2 = rightPinData ? "├" : "│"

        const lpStr = leftPinData ? String(leftPinData.pinNumber) : null
        const rpStr = rightPinData ? String(rightPinData.pinNumber) : null

        if (lpStr && rpStr) {
          // Place left pin at start, right pin at end, spaces in between
          const spacesNeeded = midWidth - lpStr.length - rpStr.length
          mid1 = lpStr + " ".repeat(Math.max(1, spacesNeeded)) + rpStr
        } else if (lpStr) {
          mid1 = lpStr + " ".repeat(Math.max(0, midWidth - lpStr.length))
        } else if (rpStr) {
          mid1 = " ".repeat(Math.max(0, midWidth - rpStr.length)) + rpStr
        } else {
          mid1 = " ".repeat(Math.max(0, midWidth))
        }
      }
      // Compose row string for the variable-width chip body
      const rowStr =
        mid0 +
        (mid1.length === chipWidth - 2
          ? mid1
          : mid1.padEnd(chipWidth - 2, " ")) + // Ensure mid1 is correct width
        mid2
      // Place each character of the variable-width chip body - use grid coordinates
      for (let col = 0; col < rowStr.length; ++col) {
        const gridX = (chipGridX + col) / opts.gridScaleX!
        const gridY = (chipGridY + r) / opts.gridScaleY!
        g.putOverlay(gridX, gridY, rowStr[col]!)
      }
    }
  }
  // 2. Draw labels
  for (const label of circuit.netLabels) {
    if (label.netId.length > 0) {
      // Render only the first character of the label as an abbreviation.
      const abbreviatedChar = label.netId[0]!
      g.putOverlay(label.x, label.y, abbreviatedChar)
    }
  }
  // 3. Draw traces
  for (const line of circuit.lines) {
    if (line.start.x === line.end.x) {
      // Vertical line
      const x = line.start.x
      const y_start_coord = line.start.y
      const y_end_coord = line.end.y
      const y_min = Math.min(y_start_coord, y_end_coord)
      const y_max = Math.max(y_start_coord, y_end_coord)

      if (y_min === y_max) continue // Skip zero-length lines

      g.addEdge(x, y_start_coord, y_start_coord < y_end_coord ? "up" : "down")
      g.addEdge(x, y_end_coord, y_start_coord < y_end_coord ? "down" : "up")

      // Fill in intermediate points using grid-scaled increments
      const gridY_min = Math.round(y_min * opts.gridScaleY!)
      const gridY_max = Math.round(y_max * opts.gridScaleY!)
      for (let gridY = gridY_min + 1; gridY < gridY_max; gridY++) {
        const y = gridY / opts.gridScaleY!
        g.addEdge(x, y, "up")
        g.addEdge(x, y, "down")
      }
    } else if (line.start.y === line.end.y) {
      // Horizontal line
      const y = line.start.y
      const x_start_coord = line.start.x
      const x_end_coord = line.end.x
      const x_min = Math.min(x_start_coord, x_end_coord)
      const x_max = Math.max(x_start_coord, x_end_coord)

      if (x_min === x_max) continue // Skip zero-length lines

      g.addEdge(
        x_start_coord,
        y,
        x_start_coord < x_end_coord ? "right" : "left",
      )
      g.addEdge(x_end_coord, y, x_start_coord < x_end_coord ? "left" : "right")

      // Fill in intermediate points using grid-scaled increments
      const gridX_min = Math.round(x_min * opts.gridScaleX!)
      const gridX_max = Math.round(x_max * opts.gridScaleX!)
      for (let gridX = gridX_min + 1; gridX < gridX_max; gridX++) {
        const x = gridX / opts.gridScaleX!
        g.addEdge(x, y, "left")
        g.addEdge(x, y, "right")
      }
    }
    // Diagonal lines are not handled by this logic
  }
  // 4. Draw connectionPoints with showAsIntersection
  for (const cp of circuit.connectionPoints) {
    if ((cp as any).showAsIntersection) {
      g.putOverlay(cp.x, cp.y, "●")
    }
  }

  // 5. Draw passives after traces to avoid being overwritten
  for (const chip of passives) {
    const isHorizontal = chip.leftPinCount > 0 || chip.rightPinCount > 0

    if (isHorizontal) {
      const startX = chip.x - chip.getWidth() / 2
      const totalCharsPossible = chip.getWidth() / (1 / opts.gridScaleX!)
      for (
        let i = 0, charCount = 0;
        i < chip.getWidth();
        i += 1 / opts.gridScaleX!, charCount++
      ) {
        if (totalCharsPossible <= 3) {
          if (chip.chipId[charCount]) {
            g.putOverlay(startX + i, chip.y, chip.chipId[charCount]!)
          }
        } else if (i === 0) {
          g.putOverlay(startX + i, chip.y, "[")
        } else if (i >= chip.getWidth() - 1 / opts.gridScaleX!) {
          g.putOverlay(startX + i, chip.y, "]")
        } else if (chip.chipId[charCount - 1]) {
          g.putOverlay(startX + i, chip.y, chip.chipId[charCount - 1]!)
        }
      }
    } else {
      // Vertical passive: place label at center with boundary markers above/below
      g.putOverlay(chip.x, chip.y - chip.getHeight() / 2, "┬")
      g.putOverlay(chip.x, chip.y, chip.chipId[0]!)
      if (chip.chipId[1]) {
        g.putOverlay(chip.x + 1 / opts.gridScaleX!, chip.y, chip.chipId[1]!)
      }
      g.putOverlay(chip.x, chip.y + chip.getHeight() / 2, "┴")
    }
  }

  return g
}
