-- Made by a super duper cool person named ArachnitCZ contact here: http://steamcommunity.com/profiles/76561198015206549/

player_manager.AddValidModel( "Invisible PM", "models/arachnit/gmod/invisible_pm/invisible_pm.mdl" );
player_manager.AddValidHands( "Invisible PM", "models/arachnit/gmod/invisible_pm/invisible_pm_arms.mdl", 0, "00000000" )

-- Following code was made by: http://steamcommunity.com/profiles/76561198041038374/

hook.Add("PostDrawViewModel", "invisible_weapons", function(ent, ply, wep)
    if LocalPlayer():GetModel():find("invisible_pm") then
        ent:SetNoDraw(true)
    else
        ent:SetNoDraw(false)
    end
end)

-- hook.Add("DrawPhysgunBeam", "invisible_physgunbeam", function()
    -- if LocalPlayer():GetModel():find("invisible_pm") then
        -- return false
    -- end
-- end)

hook.Add("PostDrawOpaqueRenderables", "invisible_weapons_world", function()
    for _, ply in pairs(player.GetAll()) do
        local weapon = ply:GetActiveWeapon()
        if not IsValid(weapon) then continue end
        if ply:GetModel():find("invisible_pm") then
            weapon:SetNoDraw(true)
        else
            weapon:SetNoDraw(false)
        end
    end
end)