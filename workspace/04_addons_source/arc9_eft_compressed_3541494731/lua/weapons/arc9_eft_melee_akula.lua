SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_akula") or "Akula push dagger"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_akula_desc") or [[As dangerous as the fish its named after.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_dagger.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_dagger.mdl"

SWEP.WorldModelOffset = {
    Pos = Vector(-9.5, 5.5, -14.5),
    Ang = Angle(20, -10, 195),
    TPIKPos = Vector(1, 3, 0),
    TPIKAng = Angle(-5, 70, 90),
}

SWEP.DamageMax = 39

SWEP.BashDamage = 24
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.4 / 0.0254 * 2
SWEP.PreBashTime = 0.23
SWEP.PostBashTime = 0.3

SWEP.Bash2Damage = 39
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.5 / 0.0254 * 2
SWEP.PreBash2Time = 0.3
SWEP.PostBash2Time = 0.45

-- SWEP.CustomizeAng = Angle(90, 30, -110)
-- SWEP.CustomizePos = Vector(-5, 22, 16)
SWEP.CustomizeAng = Angle(60, 40, -35)
SWEP.CustomizePos = Vector(14, 14, 1.4)
SWEP.CustomizeSnapshotFOV = 40
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },

    ["draw"] = {
        Source = "draw",
        EventTable = {
            { s = "weapons/darsu_eft/melee/knife_bayonet_equip.ogg", t = 0.25 },
        }
    },

    ["holster"] = {
        Source = "holster",
        EventTable = {
            { s = "weapons/darsu_eft/melee/knife_bayonet_holster.ogg", t = 0.25 },
        }
    },

    ["inspect"] = {
        Source = "inspect"
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