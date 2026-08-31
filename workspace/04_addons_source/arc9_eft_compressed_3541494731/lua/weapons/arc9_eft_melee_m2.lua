SWEP.Base = "arc9_eft_melee_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_melee") or "Melee"
SWEP.Spawnable = true
SWEP.AdminOnly = false

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_millerbros") or "Miller Bros. Blades M-2"
SWEP.Class = ARC9:GetPhrase("eft_class_weapon_melee") or "Melee Weapon"
SWEP.Description = ARC9:GetPhrase("eft_weapon_millerbros_desc") or [[Designed as a tool for working with hard surfaces. Materials and construction are designed to provide optimal impact and strength. The head of the axe is made of 6AL4V titanium with a thickness of 2.85 inches.]]

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_melee_bros_m2.mdl"
SWEP.WorldModel = "models/weapons/arc9/darsu_eft/w_melee_bros_m2-2_lod0www.mdl" -- forgor rename in qc

SWEP.DamageMax = 34

SWEP.BashDamage = 34
SWEP.BashLungeRange = 0
SWEP.BashRange = 0.7 / 0.0254 * 2
SWEP.PreBashTime = 0.3
SWEP.PostBashTime = 0.4

SWEP.Bash2Damage = 48
SWEP.Bash2LungeRange = 0
SWEP.Bash2Range = 0.7 / 0.0254 * 2
SWEP.PreBash2Time = 0.45
SWEP.PostBash2Time = 0.5

SWEP.CustomizeAng = Angle(87, -25, -94.3)
SWEP.CustomizePos = Vector(-8, 25, 15)
SWEP.CustomizeSnapshotFOV = 75
SWEP.CustomizeRotateAnchor = Vector(19, -4.28, -5.23)

SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },

    ["draw"] = {
        Source = "draw_sword",
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
        Source = "inspect_sword"
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