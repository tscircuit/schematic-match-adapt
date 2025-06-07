import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { detectPassiveOrientation } from "./detectPassiveOrientation"
import { getMatchedBoxes } from "lib/matching/getMatchedBoxes"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

/**
 * Transforms the target netlist to be compatible with the template's passive structures.
 * Instead of changing the template's passives, we adapt the target to match the template.
 */
export function transformTargetForPassiveCompatibility(
  template: CircuitBuilder,
  target: InputNetlist,
): InputNetlist {
  // Create a copy of the target netlist to avoid mutating the original
  const transformedTarget: InputNetlist = {
    boxes: target.boxes.map((box) => ({ ...box })),
    nets: target.nets?.map((net) => ({ ...net })) || [],
    connections: target.connections.map((conn) => ({
      ...conn,
      connectedPorts: [...conn.connectedPorts],
    })),
  }

  // Get proper box matching between template and target
  const currentNetlist = template.getNetlist()
  const normalizedTemplateResult = normalizeNetlist(currentNetlist)
  const normalizedTargetResult = normalizeNetlist(target)
  const normalizedTemplate = normalizedTemplateResult.normalizedNetlist
  const normalizedTarget = normalizedTargetResult.normalizedNetlist

  const matchedBoxes = getMatchedBoxes({
    candidateNetlist: normalizedTemplate,
    targetNetlist: normalizedTarget,
  })

  // Find passive components in template
  const templatePassives = template.chips.filter((chip) => chip.isPassive)

  for (const templatePassive of templatePassives) {
    // Find the box index for this template passive
    const templateBoxIndex = normalizedTemplateResult.transform.boxIdToBoxIndex[templatePassive.chipId]
    if (templateBoxIndex === undefined) continue

    // Find the matched target box
    const match = matchedBoxes.find(m => m.candidateBoxIndex === templateBoxIndex)
    if (!match) continue // No matching box in target

    // Get the target box ID from the match
    const targetBoxId = Object.entries(normalizedTargetResult.transform.boxIdToBoxIndex)
      .find(([_, boxIndex]) => boxIndex === match.targetBoxIndex)?.[0]
    if (!targetBoxId) continue

    const targetBox = transformedTarget.boxes.find(box => box.boxId === targetBoxId)
    if (!targetBox) continue

    try {
      const templateOrientation = detectPassiveOrientation(templatePassive)

      // Transform the target passive's pin structure to match the template
      if (templateOrientation === "vertical") {
        // Template has vertical passive, ensure target matches
        if (targetBox.leftPinCount > 0 || targetBox.rightPinCount > 0) {
          // Target has horizontal structure, transform to vertical
          const totalPins = targetBox.leftPinCount + targetBox.rightPinCount
          targetBox.leftPinCount = 0
          targetBox.rightPinCount = 0
          targetBox.bottomPinCount = Math.ceil(totalPins / 2)
          targetBox.topPinCount = Math.floor(totalPins / 2)
        }
      } else {
        // Template has horizontal passive, ensure target matches
        if (targetBox.bottomPinCount > 0 || targetBox.topPinCount > 0) {
          // Target has vertical structure, transform to horizontal
          const totalPins = targetBox.bottomPinCount + targetBox.topPinCount
          targetBox.bottomPinCount = 0
          targetBox.topPinCount = 0
          targetBox.leftPinCount = Math.ceil(totalPins / 2)
          targetBox.rightPinCount = Math.floor(totalPins / 2)
        }
      }
    } catch (error) {
      // If we can't detect orientation, skip transformation
      continue
    }
  }

  return transformedTarget
}
