SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_taran") or "PR-Taran baton"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_taran_desc") or [[The PR-Taran baton with side handle is used by law enforcement agencies for protection and crowd control.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_taran.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_taran.mdl"

SWEP.DamageMax = 26

SWEP.BashDamage = 26
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.6 / 0.0254 * 2
SWEP.PreBashTime = 0.3
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 43
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.65 / 0.0254 * 2
SWEP.PreBash2Time = 0.5
SWEP.PostBash2Time = 0.6

SWEP.CustomizeAng = Angle(87, -25, -70)
SWEP.CustomizePos = Vector(2, 28, 15.5)
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

local path = "weapons/darsu_eft/melee/"
SWEP.MeleeSwingSound = {path .. "taran_swing_01.ogg", path .. "taran_swing_02.ogg", path .. "taran_swing_03.ogg"}

SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },

    ["draw"] = {
        Source = "draw_sword",
        EventTable = {
            { s = "weapons/darsu_eft/melee/knife_bayonet_equip.ogg", t = 0 },
        }
    },

    ["holster"] = {
        Source = "holster",
        EventTable = {
            { s = "weapons/darsu_eft/melee/knife_bayonet_holster.ogg", t = 0.25 },
        }
    },

    ["inspect"] = {
        Source = "inspect_sword"
    },

    ["bash"] = {
        Source = "fire1_axe"
    },
    ["bash2"] = {
        Mult = 0.85,
        Source = "fire_voodoo"
    },

    ["impact"] = {
        Source = "fire1_axe_hit"
    },
    ["impact2"] = {
        Source = "fire_voodoo_hit"
    },
}


-- thing to make everyone jam guns if someone hold the taran,,,,,, 
-- in original this works only on boss - boss gives nearby players panic buff and their guns jam


-- local enabletaranjam = ARC9EFTBASE and GetConVar("arc9_eft_taran_jam") or CreateConVar("arc9_eft_taran_jam", "1", {FCVAR_ARCHIVE, FCVAR_REPLICATED}, "for melee pack - if ANY player draws PR-Taran, this will make all guns forcefully jammed (Sets arc9 jam chance modifier to 9999, sets to prev value when no holding taran).", 0, 1)
local enabletaranjam = GetConVar("arc9_eft_taran_jam") or CreateConVar("arc9_eft_taran_jam", "1", {FCVAR_ARCHIVE, FCVAR_REPLICATED}, "for melee pack - if ANY player draws PR-Taran, this will make all guns forcefully jammed (Sets arc9 jam chance modifier to 9999, sets to prev value when no holding taran).", 0, 1)

local fuckthis = 0
hook.Add("ARC9_MalfunctionMeanShotsToFailHook", "arc9eftjammer", function(wep, data)
    if fuckthis < CurTime() and enabletaranjam:GetBool() then
        fuckthis = CurTime() + 1.5
        
        local funnycheck = false

        for _, ply in player.Iterator() do
            if IsValid(ply) and IsValid(ply:GetActiveWeapon()) and ply:GetActiveWeapon():GetClass() == "arc9_eft_melee_taran" then
                funnycheck = true
                break
            end
        end
        
        if funnycheck then return data * 9999 end
    end
end)