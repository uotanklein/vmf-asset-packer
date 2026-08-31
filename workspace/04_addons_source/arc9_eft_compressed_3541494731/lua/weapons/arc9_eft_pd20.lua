AddCSLuaFile()
SWEP.Base = "arc9_eft_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.Spawnable = true

------------------------- |||           Trivia            ||| -------------------------

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_pd20")
SWEP.Description = ARC9:GetPhrase("eft_weapon_pd20_desc")

SWEP.Class = ARC9:GetPhrase("eft_class_weapon_toy")
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_pist")

SWEP.Trivia = {
    ["eft_trivia_manuf1"] = "eft_trivia_manuf_tarkovtoy",
    ["eft_trivia_cal2"] = "eft_trivia_calibr_20x1",
    ["eft_trivia_act3"]= "eft_trivia_act_spring",
    ["eft_trivia_country4"] = "eft_trivia_country_ussr",
    ["eft_trivia_year5"] = "~1960 ?"
}

SWEP.StandardPresets = false

SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_pd20.mdl"
SWEP.WorldModel = "models/weapons/w_pist_glock18.mdl"

------------------------- |||           Offsets            ||| -------------------------

SWEP.WorldModelOffset = {
    Pos = Vector(-16.25, 5.5, -4),
    Ang = Angle(-7, 0, 180),
    TPIKPos = Vector(-4, 8, -5), -- rpg
    TPIKAng = Angle(-11.5, 0, 180),
    Scale = 1,

    TPIKHolsterOffset = Vector(-2, -2, 0),
}

SWEP.IronSights = {
    Pos = Vector(-4.265, -8, 2.05),
    Ang = Angle(0, 0.00, 0),
    Midpoint = { -- Where the gun should be at the middle of it's irons
        Pos = Vector(-1, 0, 8),
        Ang = Angle(0, 0, -145),
    },
    Magnification = 1.1,
}

SWEP.ActivePos = Vector(-0.5, -2.5, -.6)
SWEP.SprintAng = Angle(0, 20.6,  -15.2)
SWEP.SprintPos = Vector(0.5, -5.1, -13.5)
SWEP.CustomizePos = Vector(21.85, 35, 4)
SWEP.CustomizeSnapshotFOV = 35
SWEP.CustomizeRotateAnchor = Vector(21.85, -4.28, -5.23)
SWEP.CustomizeSnapshotPos = Vector(0, 0, 0)

SWEP.NonTPIKAnimReload = ACT_HL2MP_GESTURE_RELOAD_REVOLVER

SWEP.HoldTypeHolstered = "normal"

if GetConVar("arc9_eft_nontpik_mode"):GetBool() then -- pistols
    SWEP.HoldType = "revolver"
    SWEP.HoldTypeSprint = "normal"
    SWEP.HoldTypeSights = "revolver"
    SWEP.HoldTypeCustomize = "passive"
end

-- this thing WILL one hand sprint always
SWEP.OneHandedSprint = true
SWEP.SprintAng = Angle(3, 33, -12)
SWEP.SprintPos = Vector(3, -7.1, -13)
SWEP.HoldTypeSprint = "normal"

------------------------- |||           Stats            ||| -------------------------

SWEP.Spread = 13.41 * ARC9.MOAToAcc
SWEP.RPM = 450
SWEP.EFTErgo = 85
SWEP.BarrelLength = 16
SWEP.Ammo = "pistol" -- What ammo type this gun uses.
SWEP.Firemodes = { { Mode = 1 } }
SWEP.ClipSize = 20 -- Self-explanatory.
SWEP.ShootPosOffset = Vector(2, 8, -2.5)
SWEP.TracerNum = 1 -- Tracer every X
SWEP.TracerColor = Color(255, 225, 200) -- Color of tracers. Only works if tracer effect supports it. For physical bullets, this is compressed down to 9-bit color.


SWEP.Slot = 1

------------------------- |||           Recoil            ||| -------------------------

SWEP.Recoil = 1 -- general multiplier of main recoil

SWEP.RecoilUp   = 2   -- up recoil
SWEP.RecoilSide = 1.5 -- sideways recoil
SWEP.RecoilRandomUp   = 0.2 -- random up/down
SWEP.RecoilRandomSide = 0.2   -- random left/right

SWEP.RecoilAutoControl = 3.8 -- autocompenstaion, could be cool if set to high but it also affects main recoil

-- visual recoil   aka visrec
SWEP.VisualRecoil = 1 -- general multiplier for it

SWEP.EFT_VisualRecoilUp_BURST_SEMI   = 1.5   -- up/down tilt when semi/bursts
SWEP.VisualRecoilUp                   = 1.5   --   when fullautoing
SWEP.EFT_VisualRecoilSide_BURST_SEMI = 0.001 -- left/right tilt when semi/burst
SWEP.VisualRecoilSide                 = 0.005   --   when fullautoing
SWEP.VisualRecoilRoll = 4 -- roll tilt, a visual thing

SWEP.VisualRecoilPunch = 0.75 -- How far back visrec moves the gun
SWEP.VisualRecoilPunchSights = 5 -- same but in sights only

SWEP.VisualRecoilDampingConst = 200  -- spring settings, this is speed of visrec
SWEP.VisualRecoilSpringPunchDamping = 9 -- the less this is the more wobbly gun moves
SWEP.VisualRecoilSpringMagnitude = 2 -- some third element of spring, high values make gun shake asf on low fps

SWEP.VisualRecoilPositionBumpUpHipFire = -0.01 -- gun will go down each shot by this value
SWEP.VisualRecoilPositionBumpUp = -0.01 -- same but in sights
SWEP.VisualRecoilPositionBumpUpRTScope = 0.05 -- same but in rt scopes, you probably should keep it same as sight value, i guess it doesn't matter anymore after recoil update

SWEP.EFT_ShotsToSwitchToFullAutoBehaviur = 2 -- how many shots for switch to fullauto stats from semi/burst, + 2 shots afterwards are lerping. you probably should not touch this but ok

SWEP.RecoilKick = 0.3 -- camera roll each shot + makes camera go more up when fullautoing

SWEP.VisualRecoilCenter = Vector(4.28, 15, -1.2)
SWEP.SubtleVisualRecoil = 0.35
SWEP.SubtleVisualRecoilHipFire = 7
SWEP.SubtleVisualRecoilDirection = 3
SWEP.SubtleVisualRecoilSpeed = 1

------------------------- |||           Damage            ||| -------------------------

SWEP.DamageMax = 1
SWEP.DamageMin = 0.5
SWEP.PhysBulletMuzzleVelocity = 20/0.0254
SWEP.PhysBulletGravity = 1
SWEP.AlwaysPhysBullet = true 

SWEP.RangeMin = 10
SWEP.RangeMax = 15 /0.0254

SWEP.Penetration =      0
SWEP.PenetrationDelta = 0
SWEP.ArmorPiercing =    0
SWEP.RicochetChance =   10/100

ARC9:RegisterPhysBulletModel("models/weapons/arc9/darsu_eft/pd20_disk.mdl")
SWEP.PhysBulletModel = "models/weapons/arc9/darsu_eft/pd20_disk.mdl"
SWEP.PhysBulletModelStick = 5


------------------------- |||           Malfunctions            ||| -------------------------

SWEP.Malfunction = false
SWEP.Overheat = false 

------------------------- |||           Minor stuff            ||| -------------------------

SWEP.CamQCA_Mult = 0.3
SWEP.MuzzleParticle = false 
SWEP.MuzzleEffect = false 
SWEP.NoFlash = true
SWEP.NoShellEject = true
SWEP.ShellModel = "models/weapons/arc9/darsu_eft/shells/9x18pm.mdl"
SWEP.ShellSounds = ARC9EFT.Shells9mm

------------------------- |||           Sounds            ||| -------------------------

local path = "weapons/darsu_eft/pm/"
local pathgenericpistol = "weapons/darsu_eft/generic_pistol/"

SWEP.DryFireSound = "arc9_eft_shared/weap_trigger_empty.ogg"

SWEP.EnterSightsSound = ARC9EFT.ADSPistol
SWEP.ExitSightsSound = ARC9EFT.ADSPistol

------------------------- |||           Dropped magazines            ||| -------------------------

SWEP.DropMagazineAmount = 0 -- Amount of mags to drop.
SWEP.DropMagazineTime = 0.86*1.1
SWEP.DropMagazineQCA = 4
SWEP.DropMagazinePos = Vector(0, 0, 0)
SWEP.DropMagazineAng = Angle(90, 180, 90)
SWEP.DropMagazineVelocity = Vector(0, 0, 0)

------------------------- |||           Animations            ||| -------------------------

SWEP.BulletBones = { -- the bone that represents bullets in gun/mag
    [1] = "patron_in_weapon",
}

SWEP.SuppressEmptySuffix = true
SWEP.ShotgunReload = true 
SWEP.ShotgunReloadIncludesChamber = false  
SWEP.ShotgunReloadNoChamber = true   

SWEP.Hook_TranslateAnimation = function(swep, anim)
    local elements = swep:GetElements()

    local ending = ""
    if anim == "inspect" then
        swep.EFTInspectnum = swep.EFTInspectnum or 0
        if IsFirstTimePredicted() then
            swep.EFTInspectnum = swep.EFTInspectnum + 1
        end
        local rand = swep.EFTInspectnum
        if rand == 3 then swep.EFTInspectnum = 1 rand = 1 end
        -- if empty and rand == 0 then swep.EFTInspectnum = 1 rand = 1 end

        ending = rand
        return anim .. ending
    end

    -- print("nomag:", nomag, "rand:", rand, "anim:", anim, "ending:", ending)
end



local randspin = {"arc9_eft_shared/weapon_generic_rifle_spin1.ogg","arc9_eft_shared/weapon_generic_rifle_spin2.ogg","arc9_eft_shared/weapon_generic_rifle_spin3.ogg","arc9_eft_shared/weapon_generic_rifle_spin4.ogg","arc9_eft_shared/weapon_generic_rifle_spin5.ogg","arc9_eft_shared/weapon_generic_rifle_spin6.ogg","arc9_eft_shared/weapon_generic_rifle_spin7.ogg","arc9_eft_shared/weapon_generic_rifle_spin8.ogg","arc9_eft_shared/weapon_generic_rifle_spin9.ogg","arc9_eft_shared/weapon_generic_rifle_spin10.ogg"}
local slidelock = {"arc9_eft_shared/pistol_jam_slidelock_try1.ogg", "arc9_eft_shared/pistol_jam_slidelock_try2.ogg", "arc9_eft_shared/pistol_jam_slidelock_try3.ogg"}
local slidelockgrab = {"arc9_eft_shared/pistol_jam_slidelock_grab1.ogg", "arc9_eft_shared/pistol_jam_slidelock_grab2.ogg", "arc9_eft_shared/pistol_jam_slidelock_grab3.ogg"}
local pouchin = {"arc9_eft_shared/generic_mag_pouch_in1.ogg","arc9_eft_shared/generic_mag_pouch_in2.ogg","arc9_eft_shared/generic_mag_pouch_in3.ogg","arc9_eft_shared/generic_mag_pouch_in4.ogg","arc9_eft_shared/generic_mag_pouch_in5.ogg","arc9_eft_shared/generic_mag_pouch_in6.ogg","arc9_eft_shared/generic_mag_pouch_in7.ogg"}
local pouchout = {"arc9_eft_shared/generic_mag_pouch_out1.ogg","arc9_eft_shared/generic_mag_pouch_out2.ogg","arc9_eft_shared/generic_mag_pouch_out3.ogg","arc9_eft_shared/generic_mag_pouch_out4.ogg","arc9_eft_shared/generic_mag_pouch_out5.ogg","arc9_eft_shared/generic_mag_pouch_out6.ogg","arc9_eft_shared/generic_mag_pouch_out7.ogg"}


SWEP.Animations = {
    ["idle"] = {
        Source = "idle",
    },

    ["draw"] = {
        Source = "draw",
        EventTable = {
            { s = "arc9_eft_shared/pm_draw.ogg", t = 0.05 },
        }
    },
    ["holster"] = {
        Source = "holster",
        EventTable = {
            { s =  "arc9_eft_shared/pm_holster.ogg", t = 0 },
        }
    },

    ["fire"] = {
        Source = "fire",
        EventTable = {
            { s = pathgenericpistol .. "pm_trigger_hammer.ogg", t = 0 },
        }
    },
    ["dryfire"] = {
        Source = "fire_dry",
    },


    ["reload_start"] = {
        Source = "reload_start",
        EventTable = {
            { s = randspin, t = 0.03 },
        },
    },    
    ["reload_insert"] = {
        Source = "reload_in",
        EventTable = {
            { s = path .. "ammo_singleround_pickup.ogg", t = 0.01 },
            { s = randspin, t = 0.41 },
            { s = slidelock, t = 0.1 },
            -- { s = { path .. "mosin_round_load1.ogg", path .. "mosin_round_load2.ogg", path .. "mosin_round_load3.ogg", path .. "mosin_round_load4.ogg", path .. "mosin_round_load5.ogg" }, t = 0.48 },
        },
    },   
    ["reload_finish"] = {
        Source = "reload_end",
        MinProgress = 0.95,
        FireASAP = true,
        EventTable = {
            { s = randspin, t = 0.84 },
        },
    },

    ["inspect"] = { -- TO STUPID ARK NINE SEE WE HAVE INSPECT
        Source = "idle",
    },

    ["inspect1"] = {
        Source = "look",
        EventTable = {
            { s = randspin, t = 0.16 },
            { s = randspin, t = 1.53 },
            { s = randspin, t = 2.44 },
        }
    },

    ["inspect2"] = {
        Source = "check",
        EventTable = {
            { s = randspin, t = 0.03 },
        },
    },
}


------------------------- |||           Attachments            ||| -------------------------

SWEP.EFTRequiredAtts = { }

SWEP.Attachments = {
    {
        PrintName = ARC9:GetPhrase("eft_cat_custom"),
        Category = {"eft_custom_slot", "eft_custom_toy"},
        Bone = "weapon",
        Pos = Vector(0, 16, -2),
        Ang = Angle(0, -90, 0),
        -- CosmeticOnly = true,
    },
}