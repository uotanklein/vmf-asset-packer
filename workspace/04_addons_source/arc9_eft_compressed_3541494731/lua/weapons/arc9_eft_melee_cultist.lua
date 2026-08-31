SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_cultist") or "Cultist knife"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_cultist_desc") or [[A knife of a strange shape and with strange signs, taken from the cultists. Seems like it is used as a ritual knife, but apparently it's not limited to this use. It has technological changes in the design intended for the use of toxic substances - it's better not to touch the blade.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_ritual.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_ritual.mdl"

SWEP.DamageMax = 18

SWEP.BashDamage = 18
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.35 / 0.0254 * 2
SWEP.PreBashTime = 0.3
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 23
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.45 / 0.0254 * 2
SWEP.PreBash2Time = 0.45
SWEP.PostBash2Time = 0.5

SWEP.EFTCultistUses = 2
SWEP.BashDamageTypeHook = function(swep, dmg)
    swep.EFTCultistUses = swep.EFTCultistUses - 1
    return ((swep.EFTCultistUses > 0) and DMG_POISON or DMG_CLUB) 
end

SWEP.CustomizeAng = Angle(87, -25, -94.3)
SWEP.CustomizePos = Vector(-8, 20, 15)
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },

    ["draw"] = {
        Source = "draw",
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

    ["bash"] = {
        Source = "fire1"
    },
    ["bash2"] = {
        Source = "fire2"
    },

    ["impact"] = {
        Source = "fire1_hit"
    },
    ["impact2"] = {
        Source = "fire2_hit"
    },
}