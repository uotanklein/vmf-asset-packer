--These codes are licensed under CC0.
--https://creativecommons.org/publicdomain/zero/1.0/deed

if hint_node then
	print("HintNode_Loader is already initialized.")
	return
end

hint_node = {}
hint_node.Identifier = "HintNode_Loader"
hint_node.Const = {
	AINET_VERSION_NUMBER = 37,
	NO_NODE = -1,
	MAX_NODES = 8192
}
hint_node.Enum = {
	HintIgnoreFacing = {
		HIF_NO  = 0,
		HIF_YES = 1,
		HIF_DEFAULT = 2
	},
	NPC_STATE = {
		INVALID = -1,
		NONE = 0,
		IDLE = 1,
		ALERT = 2,
		COMBAT = 3,
		SCRIPT = 4,
		PLAYDEAD = 5,
		PRONE = 6,
		DEAD = 7
	}
}
hint_node.CVar = {
	EnableInitHintHook = CreateConVar(
		"sv_enable_init_hint_hook", 0,
		FCVAR_ARCHIVE,
		"if enabled, the map node entity is ignored, possible editing of the hint node.",
		0, 1),
	EnableHintJsonLoad = CreateConVar(
		"sv_enable_hint_json_load", 0,
		FCVAR_ARCHIVE,
		"If enabled, maps/graphs/<map_name>.hint.json will be automatically loaded when the map is loaded.",
		0, 1),
	--EnableDefaultAllowUpJumpOnOverrideJumpPremission = CreateConVar(
	--	"sv_enable_default_allow_upjump_on_override_jump_premission", 0,
	--	FCVAR_ARCHIVE,
	--	"If enabled, changes the default value of the Override jump premission SpawnFlags to SF_ALLOW_JUMP_UP. (Need to restart the map after cvar change)",
	--	0, 1
	--),
}
local NO_NODE = hint_node.Const.NO_NODE

local edited = false
local initialized = false
local function CheckInitialized()
	if initialized then
		error("Already initialized. This must be called before entity initialization.")
	end
end

hint_node.internal = {}
function hint_node.internal.SetupHintData(hint_data)
	local hint_data = hint_data or {}

	local new_hint_data = {
		Position = Vector(hint_data.Position),
		
		HintType = tonumber(hint_data.HintType) or 0,
		SpawnFlags = tonumber(hint_data.SpawnFlags) or 0,

		EntityName = hint_data.EntityName or "",
		Group = hint_data.Group or "",
		ActivityName = hint_data.ActivityName or "",

		NodeFOV = tonumber(hint_data.NodeFOV) or 360,
		StartHintDisabled = tobool(hint_data.StartHintDisabled) and 1 or 0,
		NodeID = tonumber(hint_data.NodeID) or NO_NODE,
		TargetNodeID = tonumber(hint_data.TargetNodeID) or NO_NODE,
		WCNodeID = hint_data.WCNodeID or NO_NODE,
		IgnoreFacing = tonumber(hint_data.IgnoreFacing) or hint_node.Enum.HintIgnoreFacing.HIF_DEFAULT,
		MinimumState = tonumber(hint_data.MinimumState) or hint_node.Enum.NPC_STATE.IDLE,
		MaximumState = tonumber(hint_data.MaximumState) or hint_node.Enum.NPC_STATE.COMBAT,
	}

	--if not new_hint_data.SpawnFlags then
	--	new_hint_data.SpawnFlags = (new_hint_data.HintType == 901 and hint_node.CVar.EnableDefaultAllowUpJumpOnOverrideJumpPremission:GetBool()) and 65536 or 0
	--end

	return new_hint_data
end
function hint_node.internal.Reset()
	edited, initialized = false, false
	hint_node.MaxNodeID = -1
	hint_node.MaxHintNodeID = -1
	hint_node.Hints = {}
	hint_node.NodeHints = {}
end

function hint_node.internal.SetupHintEntity(ent, hint_data)
	if not IsValid(ent) then
		return
	end

	local hint_data = hint_node.internal.SetupHintData(hint_data)
	ent:SetPos(hint_data.Position)
	
	ent:SetKeyValue("strEntityName", hint_data.EntityName)
	ent:SetKeyValue("Group", hint_data.Group)
	ent:SetKeyValue("hintactivity", hint_data.ActivityName)

	ent:SetKeyValue("hinttype", hint_data.HintType)
	ent:SetKeyValue("nodeFOV", hint_data.NodeFOV)
	ent:SetKeyValue("StartHintDisabled", hint_data.StartHintDisabled)
	--ent:SetKeyValue("nNodeID", hint_data.NodeID) <-- Automatic variable
	ent:SetKeyValue("TargetNode", hint_data.TargetNodeID)
	ent:SetKeyValue("nodeid", hint_data.WCNodeID)
	ent:SetKeyValue("IgnoreFacing", hint_data.IgnoreFacing)
	ent:SetKeyValue("MinimumState", hint_data.MinimumState)
	ent:SetKeyValue("MaximumState", hint_data.MaximumState)

	ent:SetSpawnFlags(hint_data.SpawnFlags)

	return ent
end

function hint_node.internal.CreateHintEntities()
	CheckInitialized()

	hook.Run("InitializeHints")
	if edited then
		local SetupHintEntity = hint_node.internal.SetupHintEntity
		local info_node, info_node_hint = ents.Create("info_node"), ents.Create("info_node_hint")
		for node_id = 0, math.min(hint_node.MaxHintNodeID, hint_node.MaxNodeID) do
			local hint_data = hint_node.NodeHints[node_id]
			local node_entity = hint_data and SetupHintEntity(info_node_hint, hint_data) or info_node
			node_entity:Spawn()
			--CNodeEnt::m_nNodeCount is incremented when a node is spawned. (https://github.com/ValveSoftware/source-sdk-2013/blob/68c8b82fdcb41b8ad5abde9fe1f0654254217b8e/src/game/server/ai_initutils.cpp#L199)
			--this variable is not resetble from lua
		end
		info_node:Remove()
		info_node_hint:Remove()
	
		local info_hint = ents.Create("info_hint")
		for _, hint_data in pairs(hint_node.Hints) do
			SetupHintEntity(info_hint, hint_data):Spawn()
		end
		info_hint:Remove()
	end

	initialized = true
	hook.Run("InitializedHints")
end

function hint_node.Initialized()
	return initialized
end

hint_node.MaxNodeID = -1
hint_node.MaxHintNodeID = -1
hint_node.Hints = {}
hint_node.NodeHints = {}
function hint_node.AddHint(hint_data)
	CheckInitialized()
	hint_data.NodeID = tonumber(hint_data.NodeID)
	if not hint_data.NodeID or hint_data.NodeID < 0 or hint_data.NodeID >= hint_node.Const.MAX_NODES then
		hint_node.Hints[#hint_node.Hints+1] = hint_data
	else
		if hint_node.MaxHintNodeID < hint_data.NodeID then
			hint_node.MaxHintNodeID = hint_data.NodeID
		end

		hint_node.NodeHints[hint_data.NodeID] = hint_data
	end
	edited = true
end

function hint_node.LoadHintsFromJson(file_name, game_path)
	CheckInitialized()

	if not file.Exists(file_name, game_path) then 
		print("["..game_path..":"..file_name.."] is not exists.")
		return false
	end

	local json = util.JSONToTable(file.Read(file_name, game_path))
	if not json then
		print("["..game_path..":"..file_name.."] faild json parse.")
		return false
	end
	print("hint loading from ["..game_path..":"..file_name.."]")
	edited = true

	for index_str, hint_data in pairs(json.NodeHints or {}) do
		hint_data.NodeID = tonumber(index_str)
		hint_node.AddHint(hint_data)
	end

	for _, hint_data in ipairs(json.Hints or {}) do
		hint_data.NodeID = NO_NODE
		hint_node.AddHint(hint_data)
	end

	for _, hint_data in ipairs(json) do
		hint_node.AddHint(hint_data)
	end
	return true
end

if hint_node.CVar.EnableInitHintHook:GetBool() then
	local need_rebuild_nodegraph = true
	local ain_exists = false
	local ainet_ver, map_ver = 0, 0
	local ain_time, bsp_time = 0, 0
	local ain = file.Open("maps/graphs/"..game.GetMap()..".ain", "rb", "GAME")
	if ain then
		ain_exists = true
		ainet_ver, map_ver = ain:ReadLong(), ain:ReadLong() --Skip ain_header (8bytes)
		
		if ainet_ver == hint_node.Const.AINET_VERSION_NUMBER then
			hint_node.MaxNodeID = math.min(ain:ReadLong() - 1, hint_node.Const.MAX_NODES - 1)
		end
		ain:Close()
		

		ain_time = file.Time("maps/graphs/"..game.GetMap()..".ain", "MOD")
		bsp_time = file.Time("maps/"..game.GetMap()..".bsp", "GAME")

		need_rebuild_nodegraph =
			ainet_ver ~= hint_node.Const.AINET_VERSION_NUMBER or
			map_ver ~= game.GetMapVersion() or
			ain_time < bsp_time
	end
	
	local loaded_hint_nodes = false
	if hint_node.CVar.EnableHintJsonLoad:GetBool() then
		loaded_hint_nodes =
			hint_node.LoadHintsFromJson("data/map_hints/"..game.GetMap()..".json", "GAME") or
			hint_node.LoadHintsFromJson("data_static/map_hints/"..game.GetMap()..".json", "GAME") or
			hint_node.LoadHintsFromJson("maps/graphs/"..game.GetMap()..".hint.json", "GAME")
	end

	local detail_messages = {
		string.format("ain_exists: %s", ain_exists),
		string.format("ainet_ver: %s (%d, %d)", ainet_ver == hint_node.Const.AINET_VERSION_NUMBER, ainet_ver, hint_node.Const.AINET_VERSION_NUMBER),
		string.format("map_ver: %s (%d, %d)", map_ver == game.GetMapVersion(), map_ver, game.GetMapVersion()),
		string.format("file_time: %s (%d, %d)", ain_time >= bsp_time, ain_time, bsp_time),
	}
	for _, msg in pairs(detail_messages) do
		print("    "..msg)
	end

	if edited then
		if not GetConVar("ai_norebuildgraph"):GetBool() and need_rebuild_nodegraph then
			hint_node.MaxNodeID = -1
			local message =
				"HintNode Loader:\n"..
				"    This map requires rebuilding the nodegraph so no hint nodes are loaded.\n"..
				"    Please \"restart\" the map for the hint nodes to be applied.\n"
	
			if game.SinglePlayer() then
				hook.Add("PlayerInitialSpawn", hint_node.Identifier, function(ply)
					ply:ChatPrint(message)
					for _, msg in pairs(detail_messages) do
						ply:ChatPrint("        "..msg.."\n")
					end
				end)
			else
				print(message)
				for _, msg in pairs(detail_messages) do
					print("        "..msg)
				end
			end
		else
			local create_hints = false
			hook.Add("OnEntityCreated", hint_node.Identifier, function(ent)
				if not initialized then
					if ent:GetClass() == "network" then
						create_hints = true
					elseif create_hints then
						create_hints = false
						hint_node.internal.CreateHintEntities()
					end
				else
					if tostring(ent) == "Entity [0][ai_hint]" then
						ent:Remove()
					end
				end
			end)
			hook.Add("InitPostEntity", hint_node.Identifier, function()
				hook.Remove("OnEntityCreated", hint_node.Identifier)
	
				if not initialized then
					hint_node.internal.CreateHintEntities()
				end
			end)
		end
	end
end
