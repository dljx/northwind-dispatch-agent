# -*- coding: utf-8 -*-
"""Build the workflow payload. Safety is evaluated before triage and has no way back."""
import io, json

SAFETY_SCRIPT = """A hazard has been reported. Nothing else in this call matters now.

Say this, and only this:

"Stop what you're doing and leave the building now — don't touch any light switches or \
appliances on the way out. Once you're outside, call 911, then call the gas company. \
We can't send anyone until they've cleared it. Please go now."

Then end the call.

Do not triage the equipment. Do not ask diagnostic questions. Do not offer, hold, or book \
an appointment. Do not quote a price. Do not soften the instruction, add reassurance of \
your own, or improvise a warmer version of it.

If the caller asks anything at all — what it might be, whether someone can come out, what \
it will cost — do not answer. Repeat the instruction to get out and call 911, then end the \
call. A caller who is still on the phone with you is a caller who is still inside."""

DISPATCH_PROMPT = """No hazard was reported. Handle this as a normal dispatch call, \
following the flow in your instructions: understand the problem, classify the urgency, \
confirm the full service address out loud, offer two windows, read the chosen window back \
and get an explicit yes, then book it."""

HAZARD_CONDITION = (
    "The caller has mentioned any of the following, however briefly or uncertainly: a "
    "smell of gas, a gas leak, a suspected gas leak, carbon monoxide, a CO alarm, a "
    "carbon monoxide detector going off, or any alarm sounding in the building. Route "
    "here on any mention, including a hedged one such as 'I think I smell gas' or 'there "
    "might be a gas smell'. When in doubt, route here."
)

workflow = {
    "prevent_subagent_loops": False,
    "subgraphs": {},
    "nodes": {
        "start_node": {
            "type": "start",
            "position": {"x": 0, "y": 0},
            "edge_order": ["e_hazard", "e_normal"],
        },
        "safety": {
            "type": "override_agent",
            "label": "Hazard — evacuate",
            "additional_prompt": SAFETY_SCRIPT,
            "position": {"x": 340, "y": -140},
            "edge_order": [],
            "entry_behavior": "generate_immediately",
        },
        "dispatch": {
            "type": "override_agent",
            "label": "Dispatch",
            "additional_prompt": DISPATCH_PROMPT,
            "position": {"x": 340, "y": 140},
            "edge_order": ["e_hazard_midcall"],
        },
    },
    # safety has no outgoing edges. It is a sink: once the conversation is there it
    # cannot route anywhere, which is a stronger guarantee than "the only edge out goes
    # to an end node". The call is ended by the agent calling end_call, per the script.
    #
    # The earlier version had safety -> hangup as unconditional, and that edge fired the
    # instant the node was entered — the workflow advanced to the end node before the
    # agent was ever given a turn to speak. The hazard routing was working; the script
    # was simply never said. Only a simulation test surfaced that.
    "edges": {
        # Order matters. Hazard is evaluated first, so a caller who leads with
        # "my furnace is dead and I smell gas" never reaches triage.
        "e_hazard": {
            "source": "start_node",
            "target": "safety",
            "forward_condition": {"type": "llm", "condition": HAZARD_CONDITION},
        },
        "e_normal": {
            "source": "start_node",
            "target": "dispatch",
            "forward_condition": {"type": "unconditional"},
        },
        # A hazard raised mid-call must route too. The start node is evaluated once,
        # so without this edge a caller who opens with the furnace and mentions the gas
        # smell three turns later stays in dispatch forever — which is precisely the
        # scenario the demo runs. Found by a simulation test, not by reading the graph.
        "e_hazard_midcall": {
            "source": "dispatch",
            "target": "safety",
            "forward_condition": {"type": "llm", "condition": HAZARD_CONDITION},
        },
    },
}

io.open("_wf.json", "w", encoding="utf-8").write(
    json.dumps({"workflow": workflow})
)
print("nodes:", list(workflow["nodes"].keys()))
print("edges:", list(workflow["edges"].keys()))
print("payload bytes:", len(json.dumps(workflow)))
