if SERVER then
util.AddNetworkString("VManip_SimplePlay")

hook.Add("PlayerUse","VManip_UseDoorAnimAdjust",function(ply,ent)

if ent:GetClass() == "prop_door_rotating" or ent:GetClass() == "func_door_rotating" then ply.usecooldown=CurTime()+1 return end
end)

if !ConVarExists("vmanip_dooranim_hybridanim") then
    CreateConVar("vmanip_dooranim_hybridanim", '1', FCVAR_ARCHIVE)
end

if !ConVarExists("vmanip_dooranim_screenbob") then
    CreateConVar("vmanip_dooranim_screenbob", '1', FCVAR_ARCHIVE)
end

hook.Add("PlayerUse","VManip_UseDoorAnim",function(ply,ent)
local usedoorcooldown=ply.usedoorcooldown or 0
if ent!=nil and ply:KeyPressed(IN_USE) and ((ent:GetClass() == "prop_door_rotating" or ent:GetClass() == "func_door_rotating") and !ent:GetInternalVariable("m_bLocked")) and CurTime()>usedoorcooldown and !ent.LFS then --fix LFS
	ply.usecooldown=CurTime()+1 ply.usedoorcooldown=CurTime()+0.5
	ply:EmitSound("weapons/vmanip_usedoor"..tostring(math.random(1,2))..".wav")
	if GetConVarNumber("vmanip_dooranim_hybridanim") == 1 then
		local tmp = ent:GetSaveTable().m_eDoorState

	    local doorAngles = ent:GetAngles()
		local playerPosition = ply:GetPos()
		local doorToLocal = ent:WorldToLocal(playerPosition)

		-- if tmp == 1 or tmp == 2 then
		--     -- Door is closing
		--     if doorToLocal.x > 0 then
		--         -- Player is on the left side of the closing door
		--         net.Start("VManip_SimplePlay")
		--         net.WriteString("vault")
		--         net.Send(ply)
		--     else
		--         -- Player is on the right side of the closing door
		--         net.Start("VManip_SimplePlay")
		--         net.WriteString("usedoor")
		--         net.Send(ply)
		--     end
		-- else
		--     -- Door is opening
		--     if doorToLocal.x > 0 then
		--         -- Player is on the left side of the opening door
		--         net.Start("VManip_SimplePlay")
		--         net.WriteString("usedoor")
		--         net.Send(ply)
		--     else
		--         -- Player is on the right side of the opening door
		--         net.Start("VManip_SimplePlay")
		--         net.WriteString("vault")
		--         net.Send(ply)
		--     end
		-- end
	    if doorToLocal.y > 0 then
	        -- Player is on the left side of the closing door
	        if tmp == 1 or tmp == 2 then

	        net.Start("VManip_SimplePlay")
	        net.WriteString("usedoor")
	        net.Send(ply)
	        else
		        net.Start("VManip_SimplePlay")
		        net.WriteString("usedoor")
		        net.Send(ply)
	        end
	    else
	        -- Player is on the right side of the closing door
	        if tmp == 1 or tmp == 2 then

	        net.Start("VManip_SimplePlay")
	        net.WriteString("vault")
	        net.Send(ply)
	        else

	        net.Start("VManip_SimplePlay")
	        net.WriteString("usedoor")
	        net.Send(ply)
	        end
	    end
	else
        net.Start("VManip_SimplePlay")
        net.WriteString("usedoor")
        net.Send(ply)

	end
	

	if IsValid(ply:GetActiveWeapon()) then
		local wpn = ply:GetActiveWeapon():GetClass()
		if GetConVarNumber("vmanip_dooranim_screenbob") == 1 then
			if string.find(wpn, "mg_") then
				ply:ViewPunch( Angle( 1.5, 0, -3.3 ) )
			else
				ply:ViewPunch( Angle( 0.5, 0, -2 ) )
			end
		end
	end
end

end)
end