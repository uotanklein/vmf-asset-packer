TOOL.Name = "#tool.overhauled_bone.name"
TOOL.Category = "kuma7"

local selectedEntityName = "overhauled_bone_entity"
local fixAABB

if CLIENT then
	TOOL.Information = {
		{name = "info", stage = 1},
		{name = "left"},
		{name = "right"},
		{name = "reload"}
	}
	
	TOOL.ClientConVar["nodots"] = "0"
	TOOL.ClientConVar["nolines"] = "0"
	TOOL.ClientConVar["scalechild"] = "0"
	
	TOOL.ClientConVar["dot_r"] = "0"
	TOOL.ClientConVar["dot_g"] = "255"
	TOOL.ClientConVar["dot_b"] = "0"
	TOOL.ClientConVar["dot_a"] = "255"
	TOOL.ClientConVar["sdot_r"] = "255"
	TOOL.ClientConVar["sdot_g"] = "0"
	TOOL.ClientConVar["sdot_b"] = "0"
	TOOL.ClientConVar["sdot_a"] = "255"
	TOOL.ClientConVar["line_r"] = "255"
	TOOL.ClientConVar["line_g"] = "255"
	TOOL.ClientConVar["line_b"] = "255"
	TOOL.ClientConVar["line_a"] = "255"
	
	language.Add("tool.overhauled_bone.name", "Overhauled Bone Tool")
	language.Add("tool.overhauled_bone.desc", "Manipulate the bones of any entity in an intuitive way.")
	
	language.Add("tool.overhauled_bone.1", "You've selected an entity. Now you can manipulate its bones within the context menu.")
	language.Add("tool.overhauled_bone.left", "Turn a ragdoll into an animatable prop and select it.")
	language.Add("tool.overhauled_bone.right", "Select the entity whose bones you want to manipulate.")
	language.Add("tool.overhauled_bone.reload", "Select yourself as the entity whose bones you want to manipulate.")
	
	language.Add("tool.overhauled_bone.nodots", "Don't show dots")
	language.Add("tool.overhauled_bone.nolines", "Don't show lines")
	language.Add("tool.overhauled_bone.scalechild", "Scale child bones")
	language.Add("tool.overhauled_bone.badent", "This entity does not have any bones.")
	language.Add("tool.overhauled_bone.noent", "No entity selected.")
	language.Add("tool.overhauled_bone.colors", "Color customization")
	language.Add("tool.overhauled_bone.dotcolor", "Dots")
	language.Add("tool.overhauled_bone.selecteddotcolor", "Selected Dot")
	language.Add("tool.overhauled_bone.linecolor", "Lines")
	language.Add("tool.overhauled_bone.reset", "Reset")
	language.Add("tool.overhauled_bone.resetall", "Reset all")
else
	util.AddNetworkString("OverhauledBone_SetBonePositionOffset")
	util.AddNetworkString("OverhauledBone_SetBoneAngleOffset")
	util.AddNetworkString("OverhauledBone_SetBoneScale")
	util.AddNetworkString("OverhauledBone_ResetAll")
	
	fixAABB = function(ent)
		local mins = ent:OBBMins()
		local maxs = ent:OBBMaxs()
		
		mins.z = 0
		
		ent:PhysicsInitBox(mins, maxs)
		ent:SetMoveType(MOVETYPE_NONE)
	end
	
	duplicator.RegisterEntityModifier("OverhauledBone_Duplicator", function(ply, ent, data)
		if data.wasRag then
			fixAABB(ent)
		end
	end)
	
	local function getBoneData(ply, msgType)
		local plyTool = ply:GetTool("overhauled_bone")
		if not plyTool then return end
		
		local ent = plyTool:getSelectedEntity()
		if not IsValid(ent) then return end
		
		if msgType == 2 then return ent end
		
		local id = net.ReadUInt(8)
		if ent:GetBoneCount() <= id then return end
		
		local triplet = (msgType == 0) and net.ReadVector() or net.ReadAngle()
		
		return ent, id, triplet
	end
	
	local function manipulateRecursiveSV(ent, boneID, scale, data, isChild)
		if isChild then
			if not istable(data[boneID]) then return end
			
			local x = data[boneID].x
			local y = data[boneID].y
			local z = data[boneID].z
			
			if not isnumber(x) then return end
			if not isnumber(y) then return end
			if not isnumber(z) then return end
			
			ent:ManipulateBonePosition(boneID, Vector(x, y, z))
		end
		
		ent:ManipulateBoneScale(boneID, scale)
		
		if next(data) then
			for k, v in ipairs(ent:GetChildBones(boneID)) do
				manipulateRecursiveSV(ent, v, scale, data, true)
			end
		end
	end
	
	net.Receive("OverhauledBone_SetBonePositionOffset", function(len, ply)
		local ent, id, triplet = getBoneData(ply, 0)
		if ent then ent:ManipulateBonePosition(id, triplet) end
	end)
	
	net.Receive("OverhauledBone_SetBoneAngleOffset", function(len, ply)
		local ent, id, triplet = getBoneData(ply, 1)
		if ent then ent:ManipulateBoneAngles(id, triplet) end
	end)
	
	net.Receive("OverhauledBone_SetBoneScale", function(len, ply)
		local ent, id, triplet = getBoneData(ply, 0)
		
		if ent then
			local data = net.ReadTable()
			manipulateRecursiveSV(ent, id, triplet, data)
		end
	end)
	
	net.Receive("OverhauledBone_ResetAll", function(len, ply)
		local ent = getBoneData(ply, 2)
		
		if ent then
			for i=0, ent:GetBoneCount()-1 do
				ent:ManipulateBonePosition(i, Vector(0, 0, 0))
				ent:ManipulateBoneAngles(i, Angle(0, 0, 0))
				ent:ManipulateBoneScale(i, Vector(1, 1, 1))
			end
		end
	end)
end

local function replaceRagdoll(ent)
	if not IsValid(ent) then return ent end
	
	local cls = ent:GetClass()
	if not (string.find(cls, "prop_physics") or string.find(cls, "prop_ragdoll")) then return ent end
	
	if CLIENT then return true end
	
	local newEnt = ents.Create("ent_ovbone")
	if not newEnt then return ent end
	
	newEnt:SetModel(ent:GetModel())
	newEnt:SetPos(ent:GetPos())
	newEnt:SetAngles(ent:GetAngles())
	
	if newEnt:GetFlexScale() != ent:GetFlexScale() then
		newEnt:SetFlexScale(ent:GetFlexScale())
	end
	
	for i=0, ent:GetFlexNum()-1 do
		newEnt:SetFlexWeight(i, ent:GetFlexWeight(i))
	end
	
	newEnt:SetSkin(ent:GetSkin())
	
	for i=0, ent:GetNumBodyGroups()-1 do
		newEnt:SetBodygroup(i, ent:GetBodygroup(i))
	end
	
	for i=0, ent:GetBoneCount()-1 do
		if newEnt:GetManipulateBoneScale(i) != ent:GetManipulateBoneScale(i) then newEnt:ManipulateBoneScale(i, ent:GetManipulateBoneScale(i)) end
		if newEnt:GetManipulateBoneAngles(i) != ent:GetManipulateBoneAngles(i) then newEnt:ManipulateBoneAngles(i, ent:GetManipulateBoneAngles(i)) end
		if newEnt:GetManipulateBonePosition(i) != ent:GetManipulateBonePosition(i) then newEnt:ManipulateBonePosition(i, ent:GetManipulateBonePosition(i)) end
		if newEnt:GetManipulateBoneJiggle(i) != ent:GetManipulateBoneJiggle(i) then newEnt:ManipulateBoneJiggle(i, ent:GetManipulateBoneJiggle(i)) end
	end
	
	if ent.EntityMods then
		newEnt.EntityMods = table.Copy(ent.EntityMods)
		duplicator.ApplyEntityModifiers(nil, newEnt)
	end
	
	if ent.BoneMods then
		newEnt.BoneMods = table.Copy(ent.BoneMods)
		duplicator.ApplyBoneModifiers(nil, newEnt)
	end
	
	newEnt:Spawn()
	newEnt:Activate()
	
	local wasRag = string.find(cls, "prop_ragdoll") and true or false
	if wasRag then fixAABB(newEnt) end
	
	duplicator.StoreEntityModifier(newEnt, "OverhauledBone_Duplicator", {wasRag = wasRag})
	ent:Remove()
	
	return newEnt
end

local function chooseEntity(tool, ent)
	local final = NULL
	
	if IsValid(ent) then
		if ent:GetClass() == "prop_effect" then
			if IsValid(ent.AttachedEntity) then
				final = ent.AttachedEntity
			end
		else
			if not ent:IsPlayer() or ent == tool:GetOwner() then
				final = ent
			end
		end
	end
	
	if final == tool:getSelectedEntity() then
		return false
	end
	
	if SERVER then
		tool:setSelectedEntity(final)
		
		if IsValid(final) then
			tool:SetStage(1)
		else
			tool:SetStage(0)
		end
	end
	
	return true
end

function TOOL:Initialize()
	if SERVER then
		self:SetStage(0)
	else
		self.lastSelected = NULL
		self.lastModel = ""
	end
end

function TOOL:getSelectedEntity()
	return self:GetWeapon():GetNWEntity(selectedEntityName)
end

function TOOL:setSelectedEntity(ent)
	self:GetWeapon():SetNWEntity(selectedEntityName, ent)
end

function TOOL:LeftClick(trace)
	local ent = replaceRagdoll(trace.Entity)
	if CLIENT and ent == true then return true end
	
	return chooseEntity(self, ent)
end

function TOOL:RightClick(trace)
	return chooseEntity(self, trace.Entity)
end

function TOOL:Reload()
	return chooseEntity(self, self:GetOwner())
end

function TOOL:Deploy()
	if IsValid(self:getSelectedEntity()) then
		self:SetStage(1)
	else
		self:SetStage(0)
	end
	
	return true
end

if SERVER then return end

local function isSuitableEntity(ent)
	if ent:IsWorld() then return false end
	if ent:GetBoneCount() <= 0 then return false end
	
	return true
end

local function addColorMixer(pnl, posX, convar, title)
	local mixerf = vgui.Create("DFrame", pnl)
	mixerf:SetTitle(title)
	mixerf:SetSize(300, 200)
	mixerf:SetPos(posX, 30)
	mixerf:SetDraggable(false)
	mixerf:ShowCloseButton(false)
	
	local mixer = vgui.Create("DColorMixer", mixerf)
	mixer:Dock(FILL)
	mixer:SetAlphaBar(true)
	mixer:SetConVarR("overhauled_bone_" .. convar .. "_r")
	mixer:SetConVarG("overhauled_bone_" .. convar .. "_g")
	mixer:SetConVarB("overhauled_bone_" .. convar .. "_b")
	mixer:SetConVarA("overhauled_bone_" .. convar .. "_a")
end

local function colorButtonAction(btn)
	if btn.isOpen then return end
	btn.isOpen = true
	
	local pnl = vgui.Create("DFrame")
	pnl:SetTitle("#tool.overhauled_bone.colors")
	pnl:SetSize(940, 240)
	pnl:Center()
	pnl:MakePopup()
	pnl.OnClose = function() if IsValid(btn) then btn.isOpen = nil end end
	
	addColorMixer(pnl, 10, "dot", "#tool.overhauled_bone.dotcolor")
	addColorMixer(pnl, 320, "sdot", "#tool.overhauled_bone.selecteddotcolor")
	addColorMixer(pnl, 630, "line", "#tool.overhauled_bone.linecolor")
	
	return pnl
end

local function addColorButton(panel)
	local colors = panel:Button("#tool.overhauled_bone.colors")
	local pnl
	
	function colors:DoClick()
		pnl = colorButtonAction(self) or pnl
	end
	
	function colors:OnRemove()
		if IsValid(pnl) then pnl:Remove() end
	end
end

local function manipulateRecursiveCL2(ent, boneID, children, oldData, isChild)
	for k, v in ipairs(children) do
		manipulateRecursiveCL2(ent, v, ent:GetChildBones(v), oldData, true)
	end
	
	if isChild then
		oldData[boneID] = ent:GetManipulateBonePosition(boneID)
		ent:ManipulateBonePosition(boneID, vector_origin)
	else
		if next(children) then
			ent:SetupBones()
		end
	end
end

local function manipulateRecursiveCL(ent, boneID, scale, data, parentID, oldData)
	local success = true
	
	--SetupBones may spawn hidden bones
	if parentID and not oldData[boneID] then
		return success
	end
	
	local children = ent:GetChildBones(boneID)
	
	if not parentID then
		oldData = {}
		manipulateRecursiveCL2(ent, boneID, children, oldData)
	end
	
	for k, v in ipairs(children) do
		if not manipulateRecursiveCL(ent, v, scale, data, boneID, oldData) then
			success = false
			break
		end
	end
	
	if parentID then
		if success then
			local wMatrixBone = ent:GetBoneMatrix(boneID)
			local wMatrixParent = ent:GetBoneMatrix(parentID)
			
			if wMatrixBone and wMatrixParent then
				local wPosBone = wMatrixBone:GetTranslation()
				local wAngBone = wMatrixBone:GetAngles()
				local wPosParent = wMatrixParent:GetTranslation()
				local wAngParent = wMatrixParent:GetAngles()
				
				local lPosBone = WorldToLocal(wPosBone, wAngBone, wPosParent, wAngParent)
				
				local sPosBone = lPosBone * scale
				local mPosBone = sPosBone - lPosBone
				
				data.tab[boneID] = {x = mPosBone.x, y = mPosBone.y, z = mPosBone.z}
			else
				data.tab = {}
				success = false
			end
		end
		
		ent:ManipulateBonePosition(boneID, oldData[boneID])
	else
		if next(children) then
			ent:SetupBones()
		end
	end
	
	return success
end

local function boneManipulatedAction(msg, controller, pnlID, msgType)
	if controller.ignore or controller.boneID == -1 then return end
	
	local tool = LocalPlayer():GetTool("overhauled_bone")
	if not tool or not IsValid(tool:getSelectedEntity()) then return end
	
	local sendTable = (msgType == 2) and tobool(tool:GetClientNumber("scalechild"))
	
	local x = controller.panels[pnlID]:GetValue()
	local y = controller.panels[pnlID+1]:GetValue()
	local z = controller.panels[pnlID+2]:GetValue()
	
	if sendTable then
		if x > -0.05 and x < 0.05 then x = x < 0 and -0.05 or 0.05 end
		if y > -0.05 and y < 0.05 then y = y < 0 and -0.05 or 0.05 end
		if z > -0.05 and z < 0.05 then z = z < 0 and -0.05 or 0.05 end
	end
	
	net.Start(msg)
	net.WriteUInt(controller.boneID, 8)
	
	if msgType == 0 or msgType == 2 then
		net.WriteVector(Vector(x, y, z))
	else
		net.WriteAngle(Angle(x, y, z))
	end
	
	if msgType == 2 then
		local data
		
		if sendTable then
			data = {}
			data.tab = {}
			
			manipulateRecursiveCL(tool:getSelectedEntity(), controller.boneID, Vector(x, y, z), data)
		end
		
		net.WriteTable(data and data.tab or {})
	end
	
	net.SendToServer()
end

local function resetSliders(controller)
	controller.ignore = true
	
	for i=1, 9 do
		controller.panels[i]:ResetToDefaultValue()
	end
	
	controller.ignore = nil
end

local function addController(panel)
	local reset = panel:Button("#tool.overhauled_bone.reset")
	local resetAll = panel:Button("#tool.overhauled_bone.resetall")
	
	local posH = panel:Help("")
	local posX = panel:NumSlider("Position X", nil, -128, 128, 2)
	local posY = panel:NumSlider("Position Y", nil, -128, 128, 2)
	local posZ = panel:NumSlider("Position Z", nil, -128, 128, 2)
	
	local angH = panel:Help("")
	local angX = panel:NumSlider("Angle X", nil, -180, 180, 2)
	local angY = panel:NumSlider("Angle Y", nil, -180, 180, 2)
	local angZ = panel:NumSlider("Angle Z", nil, -180, 180, 2)
	
	local scaH = panel:Help("")
	local scaX = panel:NumSlider("Scale X", nil, -18, 18, 2)
	local scaY = panel:NumSlider("Scale Y", nil, -18, 18, 2)
	local scaZ = panel:NumSlider("Scale Z", nil, -18, 18, 2)
	
	local texts = {posH, angH, scaH}
	local controllerPanels = {posX, posY, posZ, angX, angY, angZ, scaX, scaY, scaZ}
	local controller = {boneID = -1, panels = controllerPanels}
	
	for k, v in ipairs(texts) do
		v:DockMargin(0, -5, 0, 0)
	end
	
	for i=1, 6 do
		controller.panels[i]:SetDefaultValue(0)
		controller.panels[i]:DockMargin(0, -5, 0, 0)
	end
	
	for i=7, 9 do
		controller.panels[i]:SetDefaultValue(1)
		controller.panels[i]:DockMargin(0, -5, 0, 0)
	end
	
	function reset:DoClick()
		local tool = LocalPlayer():GetTool("overhauled_bone")
		local changes
		
		if tool then
			changes = {}
			
			for i=1, 9 do
				table.insert(changes, controller.panels[i]:GetValue() != controller.panels[i]:GetDefaultValue())
			end
		end
		
		resetSliders(controller)
		
		if tool then
			for k, v in ipairs({1, 4, 7}) do
				if changes[v] or changes[v+1] or changes[v+2] or (v == 7 and tobool(tool:GetClientNumber("scalechild"))) then
					controller.panels[v]:OnValueChanged()
				end
			end
		end
	end
	
	function resetAll:DoClick()
		if LocalPlayer():GetTool("overhauled_bone") then
			net.Start("OverhauledBone_ResetAll")
			net.SendToServer()
		end
		
		resetSliders(controller)
	end
	
	for i=1, 3 do
		controller.panels[i].OnValueChanged = function()
			boneManipulatedAction("OverhauledBone_SetBonePositionOffset", controller, 1, 0)
		end
	end
	
	for i=4, 6 do
		controller.panels[i].OnValueChanged = function()
			boneManipulatedAction("OverhauledBone_SetBoneAngleOffset", controller, 4, 1)
		end
	end
	
	for i=7, 9 do
		controller.panels[i].OnValueChanged = function()
			boneManipulatedAction("OverhauledBone_SetBoneScale", controller, 7, 2)
		end
	end
	
	return controller
end

local function setControllerValues(ent, bone, controller)
	if IsValid(ent) then
		local manBonePos = ent:GetManipulateBonePosition(bone)
		local manBoneAng = ent:GetManipulateBoneAngles(bone)
		local manBoneSca = ent:GetManipulateBoneScale(bone)
		
		controller.ignore = true
		controller.boneID = bone
		
		controller.panels[1]:SetValue(manBonePos.x)
		controller.panels[2]:SetValue(manBonePos.y)
		controller.panels[3]:SetValue(manBonePos.z)
		controller.panels[4]:SetValue(manBoneAng.p)
		controller.panels[5]:SetValue(manBoneAng.y)
		controller.panels[6]:SetValue(manBoneAng.r)
		controller.panels[7]:SetValue(manBoneSca.x)
		controller.panels[8]:SetValue(manBoneSca.y)
		controller.panels[9]:SetValue(manBoneSca.z)
		
		controller.ignore = nil
	end
	
	return true
end

local function addBranch(ent, controller, tree)
	local deepness = 0
	local boneList = {}
	
	for i=0, ent:GetBoneCount()-1 do
		local name = ent:GetBoneName(i)
		if name == "__INVALIDBONE__" then continue end
		
		boneList[i] = {}
		boneList[i][1] = i
		
		local curDeepness = 0
		local findRoot = i
		
		repeat
			curDeepness = curDeepness + 1
			findRoot = ent:GetBoneParent(findRoot)
		until (findRoot == -1)
		
		if curDeepness > deepness then
			deepness = curDeepness
		end
		
		local parentID = ent:GetBoneParent(i)
		
		if boneList[parentID] then
			boneList[i][2] = boneList[parentID][2]:AddNode(name, "icon16/bullet_blue.png")
		else
			boneList[i][2] = tree:AddNode(name, "icon16/bullet_blue.png")
		end
		
		boneList[i][2].DoClick = function()
			return setControllerValues(ent, boneList[i][1], controller)
		end
	end
	
	--node expansion and table clean up
	for k, v in pairs(boneList) do
		v[2]:SetExpanded(true, true)
		table.insert(tree.bones, v)
	end
	
	if boneList[0] then
		tree:SetSelectedItem(boneList[0][2])
		boneList[0][2]:DoClick()
	end
	
	return deepness
end

local function addBoneTree(panel, ent, controller)
	local scroll = vgui.Create("DHorizontalScroller")
	scroll:SetHeight(500)
	scroll:DockMargin(0, 20, 0, 0)
	
	local tree = vgui.Create("DTree")
	tree.bones = {}
	
	local deepness = addBranch(ent, controller, tree)
	tree:SetSize(120 + 30*deepness, 500)
	
	scroll:AddPanel(tree)
	panel:AddItem(scroll)
	
	local help = panel:Help("")
	help:DockMargin(0, -5, 0, 0)
	
	return tree
end

function TOOL:Think()
	local ent = self:getSelectedEntity()
	local model = ""
	
	if IsValid(ent) then
		model = ent:GetModel() or ""
	end
	
	if ent == self.lastSelected and model == self.lastModel then
		return
	end
	
	self.lastSelected = ent
	self.lastModel = model
	
	--rebuild CPanel
	local name = "overhauled_bone"
	local panel = controlpanel.Get(name)
	
	if not panel then
		MsgN("Couldn't find " .. name .. " panel!")
		return
	end
	
	self.BuildCPanel(panel)
end

function TOOL.BuildCPanel(panel)
	panel:ClearControls()
	
	local tool = LocalPlayer():GetTool("overhauled_bone")
	if not tool then return end
	
	local ent = tool:getSelectedEntity()
	
	panel:CheckBox("#tool.overhauled_bone.nodots", "overhauled_bone_nodots")
	panel:CheckBox("#tool.overhauled_bone.nolines", "overhauled_bone_nolines")
	panel:CheckBox("#tool.overhauled_bone.scalechild", "overhauled_bone_scalechild")
	
	if not IsValid(ent) then
		local p = panel:Help("#tool.overhauled_bone.noent")
		p:DockMargin(0, 0, 0, 0)
		
		return
	else
		if not isSuitableEntity(ent) then
			local p = panel:Help("#tool.overhauled_bone.badent")
			p:DockMargin(0, 0, 0, 0)
			
			return
		end
	end
	
	addColorButton(panel)
	tool.tree = addBoneTree(panel, ent, addController(panel))
end

local whitemat = Material("vgui/white")
local angle = Angle(0, 0, 0)
local mins = Vector(-0.18, -0.18, -0.18)
local maxs = Vector(0.18, 0.18, 0.18)

hook.Add("PostDrawTranslucentRenderables", "OverhauledBone_DrawBones", function()
	local self = LocalPlayer():GetTool()
	if not self or self != LocalPlayer():GetTool("overhauled_bone") then return end
	
	local ent = self:getSelectedEntity()
	if not IsValid(ent) then return end
	
	if ent == LocalPlayer() and (not LocalPlayer():ShouldDrawLocalPlayer() or IsValid(LocalPlayer():GetObserverTarget())) then return end
	if not IsValid(self.tree) then return end
	
	render.SetMaterial(whitemat)
	render.SuppressEngineLighting(true)
	
	if not tobool(self:GetClientNumber("nolines")) then
		local color = Color(self:GetClientNumber("line_r"), self:GetClientNumber("line_g"), self:GetClientNumber("line_b"), self:GetClientNumber("line_a"))
		
		for k, v in ipairs(self.tree.bones) do
			local bone1 = v[1]
			local bone2 = ent:GetBoneParent(bone1)
			if bone2 < 0 then continue end
			
			local coords1 = ent:GetBoneMatrix(bone1)
			if not coords1 then continue end
			coords1 = coords1:GetTranslation()
			
			local coords2 = ent:GetBoneMatrix(bone2)
			if not coords2 then continue end
			coords2 = coords2:GetTranslation()
			
			render.DrawLine(coords1, coords2, color)
		end
	end
	
	if not tobool(self:GetClientNumber("nodots")) then
		local color1 = Color(self:GetClientNumber("dot_r"), self:GetClientNumber("dot_g"), self:GetClientNumber("dot_b"), self:GetClientNumber("dot_a"))
		local color2 = Color(self:GetClientNumber("sdot_r"), self:GetClientNumber("sdot_g"), self:GetClientNumber("sdot_b"), self:GetClientNumber("sdot_a"))
		
		local sCoords
		
		for k, v in ipairs(self.tree.bones) do
			local bone = v[1]
			
			local coords = ent:GetBoneMatrix(bone)
			if not coords then continue end
			coords = coords:GetTranslation()
			
			if self.tree:GetSelectedItem() != v[2] then
				render.DrawBox(coords, angle, mins, maxs, color1)
			else
				sCoords = coords
			end
		end
		
		--always draw the selected bone on top of the rest
		if sCoords then render.DrawBox(sCoords, angle, mins, maxs, color2) end
	end
	
	render.SuppressEngineLighting(false)
end)