import type {
  CircuitJson,
  SchematicNetLabel,
  SchematicPort,
  SchematicTrace,
  SourceTrace,
  SourcePort,
  SourceNet,
  Point,
  SchematicTraceEdge,
} from "circuit-json"
import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { cju } from "@tscircuit/circuit-json-util"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

/**
 * Re-position/rotate schematic components in the circuit json to match the
 * layout of the circuit builder.
 */
export const applyCircuitLayoutToCircuitJson = (
  circuitJson: CircuitJson,
  circuitJsonNetlist: InputNetlist,
  layout: CircuitBuilder,
): CircuitJson => {
  // Work on a deep-clone so callers keep their original object intact
  let cj = structuredClone(circuitJson)

  const layoutNetlist = layout.getNetlist()
  const layoutNorm = normalizeNetlist(layoutNetlist)
  const cjNorm = normalizeNetlist(circuitJsonNetlist)

  const layoutBoxIndexToBoxId = new Map<number, string>()
  for (const [boxId, boxIndex] of Object.entries(
    layoutNorm.transform.boxIdToBoxIndex,
  )) {
    layoutBoxIndexToBoxId.set(boxIndex, boxId)
  }

  for (const schematicComponent of cju(cj).schematic_component.list()) {
    const sourceComponent = cju(cj).source_component.get(
      schematicComponent.source_component_id,
    )!
    const schematicPorts = cju(cj).schematic_port.list({
      schematic_component_id: schematicComponent.schematic_component_id,
    })
    // Find the schematic box index
    const boxIndex = cjNorm.transform.boxIdToBoxIndex[sourceComponent.name]!

    // Find the layout boxId
    const layoutBoxId = layoutBoxIndexToBoxId.get(boxIndex)!

    if (!layoutBoxId) {
      console.warn(`${sourceComponent.name} was not laid out`)
      continue
    }

    const layoutChip = layout.chips.find((c) => c.chipId === layoutBoxId)!

    if (!layoutChip) {
      throw new Error(`Layout chip ${layoutBoxId} not found in layout.chips`)
    }

    let cjChipWidth = layoutChip.getWidth() - 0.8
    let cjChipHeight = layoutChip.getHeight()

    if (layoutChip.isPassive) {
      cjChipWidth = 1
      cjChipHeight = 1
    }

    schematicComponent.center = layoutChip.getCenter()
    schematicComponent.size = {
      width: cjChipWidth,
      height: cjChipHeight,
    }

    for (const schematicPort of schematicPorts) {
      const { true_ccw_index, pin_number } = schematicPort
      const pn = true_ccw_index !== undefined ? true_ccw_index + 1 : pin_number

      // Use getPinLocation to get the static position of the pin,
      // as layoutChip.pin(pin_number!).x/y might have been modified by fluent calls.
      try {
        const { x: layoutX, y: layoutY } = layoutChip.getPinLocation(pn!)
        schematicPort.center = {
          x: layoutX,
          y: layoutY,
        }
      } catch (e) {
        console.error(
          `Error getting pin location for ${sourceComponent.name} pin ${pin_number}:`,
          e,
        )
      }
    }

    // Change schematic_component.symbol_name for passives to match the
    // correct orientation based on pin positions
    if (layoutChip.isPassive && schematicComponent.symbol_name) {
      // Find pin1 and pin2 positions
      const pin1Port = schematicPorts.find(p => p.pin_number === 1 || p.true_ccw_index === 0)
      const pin2Port = schematicPorts.find(p => p.pin_number === 2 || p.true_ccw_index === 1)
      
      if (pin1Port?.center && pin2Port?.center) {
        const dx = pin2Port.center.x - pin1Port.center.x
        const dy = pin2Port.center.y - pin1Port.center.y
        
        // Determine orientation based on relative positions
        // If pin1 is above pin2 (dy > 0), orientation is "down"
        // If pin1 is below pin2 (dy < 0), orientation is "up"
        // If pin1 is left of pin2 (dx > 0), orientation is "right"
        // If pin1 is right of pin2 (dx < 0), orientation is "left"
        let newOrientation: string
        
        if (Math.abs(dy) > Math.abs(dx)) {
          // Vertical orientation
          newOrientation = dy > 0 ? "down" : "up"
        } else {
          // Horizontal orientation
          newOrientation = dx > 0 ? "right" : "left"
        }
        
        // Update symbol_name if it's a resistor
        if (schematicComponent.symbol_name.includes("boxresistor")) {
          schematicComponent.symbol_name = `boxresistor_${newOrientation}`
        }
        // Could extend this for other passive types like capacitors, inductors
      }
    }
  }

  // const netIndexToLayoutNetId = new Map<number, string>()
  // for (const [netId, netIndex] of Object.entries(
  //   layoutNorm.transform.netIdToNetIndex,
  // )) {
  //   netIndexToLayoutNetId.set(netIndex, netId)
  // }

  const netIndexToCompositeNetId = new Map<number, string>()
  for (const [netId, netIndex] of Object.entries(
    cjNorm.transform.netIdToNetIndex,
  )) {
    netIndexToCompositeNetId.set(netIndex, netId)
  }

  // Filter all existing schematic_net_label items
  cj = cj.filter((elm) => elm.type !== "schematic_net_label")

  // Create new schematic_net_label items from layout.netLabels
  const newSchematicNetLabels: SchematicNetLabel[] = []
  for (const layoutLabel of layout.netLabels) {
    const netIndex = layoutNorm.transform.netIdToNetIndex[layoutLabel.netId]
    const compositeNetId =
      netIndexToCompositeNetId.get(netIndex!)! ??
      "ERROR: did not find netId using net index"
    const newLabel: SchematicNetLabel = {
      type: "schematic_net_label",
      schematic_net_label_id: compositeNetId,
      source_net_id: layoutLabel.netId, // Assumes layoutLabel.labelId is the source_net identifier
      text:
        compositeNetId.split(",").find((n) => !n.includes(".")) ??
        compositeNetId, // The text to be displayed
      center: { x: layoutLabel.x, y: layoutLabel.y },
      anchor_position: { x: layoutLabel.x, y: layoutLabel.y }, // Typically same as center for labels
      anchor_side: layoutLabel.anchorSide,
    }
    newSchematicNetLabels.push(newLabel)
  }

  // Add all newly created labels to the circuitJson array
  if (newSchematicNetLabels.length > 0) {
    cj.push(...newSchematicNetLabels)
  }

  // Create schematic_trace for each layout.lines
  const newSchematicTraces: SchematicTrace[] = []
  for (const layoutLine of layout.lines) {
    const newSchematicTrace: SchematicTrace = {
      type: "schematic_trace",
      edges: [
        {
          from: {
            x: layoutLine.start.x,
            y: layoutLine.start.y,
          },
          to: {
            x: layoutLine.end.x,
            y: layoutLine.end.y,
          },
        },
      ],
      schematic_trace_id: "asd",
      source_trace_id: "asd",
      junctions: [],
    }
    newSchematicTraces.push(newSchematicTrace)
  }

  cj = cj.filter((c) => c.type !== "schematic_trace")
  cj.push(...newSchematicTraces)

  // Filter all schematic_traces (they won't properly connect after the moving)
  cj = cj.filter((c) => c.type !== "schematic_text")

  return cj
}
