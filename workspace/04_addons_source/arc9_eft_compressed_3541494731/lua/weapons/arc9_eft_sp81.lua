AddCSLuaFile()
SWEP.Base = "arc9_eft_base"
SWEP.Category = "ARC9 - Escape From Tarkov"
SWEP.Spawnable = true
SWEP.NotForNPCs = true

------------------------- |||           Trivia            ||| -------------------------

SWEP.PrintName = ARC9:GetPhrase("eft_weapon_sp81")
SWEP.Description = ARC9:GetPhrase("eft_weapon_sp81_desc")

SWEP.Class = ARC9:GetPhrase("eft_class_weapon_signalpis")
SWEP.SubCategory = ARC9:GetPhrase("eft_subcat_grenades")

SWEP.Trivia = {
    ["eft_trivia_manuf1"] = "eft_trivia_manuf_degtyaryov",
    ["eft_trivia_cal2"] = "eft_trivia_calibr_26x75",
    ["eft_trivia_act3"]= "eft_trivia_act_breech",
    ["eft_trivia_country4"] = "eft_trivia_country_ussr",
    ["eft_trivia_year5"] = "1980"
}


SWEP.ViewModel = "models/weapons/arc9/darsu_eft/c_sp81.mdl"
SWEP.WorldModel = "models/weapons/w_pist_glock18.mdl"

------------------------- |||           Offsets            ||| -------------------------

SWEP.WorldModelOffset = {
    Pos = Vector(-16.25, 5.5, -4),
    Ang = Angle(-7, 0, 180),
    TPIKPos = Vector(-6, 6, -5), -- rpg
    TPIKAng = Angle(-5, 0, 180),
    Scale = 1
}

SWEP.IronSights = {
    Pos = Vector(-4.3, -4, 1.99),
    Ang = Angle(0, 0, 0),
    ViewModelFOV = 60,
    Midpoint = { -- Where the gun should be at the middle of it's irons
        Pos = Vector(-1, 0, 8),
        Ang = Angle(0, 0, -145),
    },
    Magnification = 1.1,
}

SWEP.ActivePos = Vector(-0.45, -1.8, -.45)
SWEP.SprintAng = Angle(0, 20.6,  -15.2)
SWEP.SprintPos = Vector(0.5, -5.1, -13.5)
SWEP.CustomizePos = Vector(20.85, 35, 3.5)
SWEP.CustomizeSnapshotFOV = 35
SWEP.CustomizeRotateAnchor = Vector(20.85, -4.28, -5.23)
SWEP.CustomizeSnapshotPos = Vector(0, 0, 0)

SWEP.NonTPIKAnimReload = ACT_HL2MP_GESTURE_RELOAD_REVOLVER

if GetConVar("arc9_eft_nontpik_mode"):GetBool() then -- pistols
    SWEP.HoldType = "revolver"
    SWEP.HoldTypeSprint = "normal"
    SWEP.HoldTypeHolstered = "normal"
    SWEP.HoldTypeSights = "revolver"
    SWEP.HoldTypeCustomize = "passive"
end

-- this thing WILL one hand sprint always
SWEP.OneHandedSprint = true
SWEP.SprintAng = Angle(3, 33, -12)
SWEP.SprintPos = Vector(3, -7.1, -13)
SWEP.HoldTypeSprint = "normal"

------------------------- |||           Stats            ||| -------------------------

SWEP.Spread = 24.06 * ARC9.MOAToAcc
SWEP.RPM = 450
SWEP.EFTErgo = 51
SWEP.BarrelLength = 18
SWEP.Ammo = "smg1_grenade" -- What ammo type this gun uses.
SWEP.Firemodes = { { Mode = 1 } }

SWEP.Slot = 1

------------------------- |||           Recoil            ||| -------------------------

SWEP.Recoil = 2 -- general multiplier of main recoil

SWEP.RecoilUp   = 2   -- up recoil
SWEP.RecoilSide = 0.5 -- sideways recoil
SWEP.RecoilRandomUp   = 0.2 -- random up/down
SWEP.RecoilRandomSide = 0.2   -- random left/right

SWEP.RecoilAutoControl = 6 -- autocompenstaion, could be cool if set to high but it also affects main recoil

-- visual recoil   aka visrec
SWEP.VisualRecoil = 2 -- general multiplier for it

SWEP.EFT_VisualRecoilUp_BURST_SEMI   = 1.25   -- up/down tilt when semi/bursts
SWEP.VisualRecoilUp                   = 1.25   --   when fullautoing
SWEP.EFT_VisualRecoilSide_BURST_SEMI = 0.001 -- left/right tilt when semi/burst
SWEP.VisualRecoilSide                 = 0.005   --   when fullautoing
SWEP.VisualRecoilRoll = 4 -- roll tilt, a visual thing

SWEP.VisualRecoilPunch = 0.75 -- How far back visrec moves the gun
SWEP.VisualRecoilPunchSights = 7 -- same but in sights only

SWEP.VisualRecoilDampingConst = 400  -- spring settings, this is speed of visrec
SWEP.VisualRecoilSpringPunchDamping = 9 -- the less this is the more wobbly gun moves
SWEP.VisualRecoilSpringMagnitude = 2 -- some third element of spring, high values make gun shake asf on low fps

SWEP.VisualRecoilPositionBumpUpHipFire = -0.1 -- gun will go down each shot by this value
SWEP.VisualRecoilPositionBumpUp = -0.1 -- same but in sights
SWEP.VisualRecoilPositionBumpUpRTScope = 0.05 -- same but in rt scopes, you probably should keep it same as sight value, i guess it doesn't matter anymore after recoil update

SWEP.EFT_ShotsToSwitchToFullAutoBehaviur = 2 -- how many shots for switch to fullauto stats from semi/burst, + 2 shots afterwards are lerping. you probably should not touch this but ok

SWEP.RecoilKick = 0.25 -- camera roll each shot + makes camera go more up when fullautoing

SWEP.VisualRecoilCenter = Vector(4.28, 15, -1.2)
SWEP.SubtleVisualRecoil = 0.35
SWEP.SubtleVisualRecoilHipFire = 7
SWEP.SubtleVisualRecoilDirection = 3
SWEP.SubtleVisualRecoilSpeed = 1

------------------------- |||           Damage            ||| -------------------------

-- default pst ghz

SWEP.DamageMax = 54/2
SWEP.DamageMin = 30/2
SWEP.PhysBulletMuzzleVelocity = 875 /0.0254
SWEP.RangeMin = 10
SWEP.RangeMax = 1000 /0.0254

SWEP.Penetration =      0
SWEP.PenetrationDelta = 0
SWEP.ArmorPiercing =    0
SWEP.RicochetChance =   0.5


------------------------- |||           Malfunctions            ||| -------------------------

SWEP.Malfunction = false
SWEP.Overheat = false

------------------------- |||           Minor stuff            ||| -------------------------

SWEP.CamQCA = 2
SWEP.CamQCA_Mult = 0.5
SWEP.MuzzleParticle = "muzzleflash_ak47" -- Used for some muzzle effects.
SWEP.ShellModel = nil
SWEP.NoShellEject = true
SWEP.ShellSounds = ARC9EFT.ShellsHeavy

------------------------- |||           Sounds            ||| -------------------------

local path = "weapons/darsu_eft/sp81/"

SWEP.ShootSound = path .. "mr133_fire_close1.ogg"
SWEP.ShootSoundIndoor = path .. "mr133_fire_indoor_close.ogg"
SWEP.DistantShootSound = path .. "mr133_fire_distant1.ogg"
SWEP.DistantShootSoundIndoor = path .. "mr133_fire_indoor_distant.ogg"

SWEP.DryFireSound = "weapons/darsu_eft/m870/mr133_trigger.ogg"

SWEP.EnterSightsSound = ARC9EFT.ADSPistol
SWEP.ExitSightsSound = ARC9EFT.ADSPistol

------------------------- |||           Dropped magazines            ||| -------------------------

SWEP.DropMagazineModel = "models/weapons/arc9/darsu_eft/shells/40x46_m381.mdl" -- Set to a string or table to drop this magazine when reloading.
SWEP.DropMagazineAmount = 1
SWEP.DropMagazineTime = 2
SWEP.DropMagazineQCA = 3
SWEP.DropMagazinePos = Vector(0, 0, 0)
SWEP.DropMagazineAng = Angle(90, 180, 90)
SWEP.DropMagazineVelocity = Vector(0, 40, 20)
SWEP.DropMagazineSounds = ARC9EFT.ShellsHeavy
SWEP.ShouldDropMag = true
SWEP.ShouldDropMagEmpty = true

------------------------- |||           Animations            ||| -------------------------

SWEP.BulletBones = { -- the bone that represents bullets in gun/mag
}

-- SWEP.SuppressEmptySuffix = true

SWEP.Hook_TranslateAnimation = function(swep, anim)
    local elements = swep:GetElements()
    local empty = swep:Clip1() == 0

    -- 0 looking
    -- 1 slide checking

    if anim == "inspect" then
        swep.EFTInspectnum = swep.EFTInspectnum or 0
        if IsFirstTimePredicted() then
            swep.EFTInspectnum = swep.EFTInspectnum + 1
        end
        local rand = swep.EFTInspectnum
        if rand == 2 then swep.EFTInspectnum = 0 rand = 0 end

        -- return anim .. rand .. (empty and "_empty" or "")
        if rand == 1 then
            return "check_real" .. (empty and "_empty" or "")
        end

        return "look" .. (empty and "_empty" or "")
    end
end

-- SWEP.ReloadHideBoneTables = {
--     [1] = {
--         "mod_magazine",
--         "patron_in_mag1",
--         "patron_in_mag2",
--         "patron_in_mag3"
--     },
-- }

local randspin = {"arc9_eft_shared/weapon_generic_rifle_spin1.ogg","arc9_eft_shared/weapon_generic_rifle_spin2.ogg","arc9_eft_shared/weapon_generic_rifle_spin3.ogg","arc9_eft_shared/weapon_generic_rifle_spin4.ogg","arc9_eft_shared/weapon_generic_rifle_spin5.ogg","arc9_eft_shared/weapon_generic_rifle_spin6.ogg","arc9_eft_shared/weapon_generic_rifle_spin7.ogg","arc9_eft_shared/weapon_generic_rifle_spin8.ogg","arc9_eft_shared/weapon_generic_rifle_spin9.ogg","arc9_eft_shared/weapon_generic_rifle_spin10.ogg"}
local pouchout = {"arc9_eft_shared/generic_mag_pouch_out1.ogg","arc9_eft_shared/generic_mag_pouch_out2.ogg","arc9_eft_shared/generic_mag_pouch_out3.ogg","arc9_eft_shared/generic_mag_pouch_out4.ogg","arc9_eft_shared/generic_mag_pouch_out5.ogg","arc9_eft_shared/generic_mag_pouch_out6.ogg","arc9_eft_shared/generic_mag_pouch_out7.ogg"}

SWEP.Animations = {
    ["idle"] = { Source = "idle" },
    ["idle_empty"] = { Source = "idle_empty" },
    ["draw"] = { Source = "draw", EventTable = { { s = "arc9_eft_shared/weap_in.ogg", t = 0 }, } },
    ["draw_empty"] = { Source = "draw_empty", EventTable = { { s = "arc9_eft_shared/weap_in.ogg", t = 0 }, } },
    ["ready"] = { Source = {"ready1", "ready2"}, EventTable = { 
        { s = "arc9_eft_shared/weap_in.ogg", t = 0 },
        { s = path .. "mts255_hammer_arm.ogg", t = 0.47 },
     } },
    ["holster"] = { Source = "holster", EventTable = { { s = "arc9_eft_shared/weap_out.ogg", t = 0 }, } },
    ["holster_empty"] = { Source = "holster_empty", EventTable = { { s = "arc9_eft_shared/weap_out.ogg", t = 0 }, } },

    ["fire"] = { Source = "fire", EventTable = { { s = "arc9_eft_shared/weap_trigger_hammer.ogg", t = 0 }, } },

    ["reload"] = {
        Source = "reload", 
        MinProgress = 0.95,
        FireASAP = true,
        MagSwapTime = 1.3,
        Mult = 0.95,
        EventTable = {
            { s = randspin, t = 0.1 },
            { s = path .. "flaregun_barrel_open.ogg", t = 0.4 },
            { s = path .. "mr43_ammo_unload_throw.ogg", t = 1.4 },
            { s = pouchout, t = 2.23 },
            { s = path .. "flaregun_shell_load.ogg", t = 2.6 },
            { s = path .. "flaregun_barrel_close.ogg", t = 3.5 },
            { s = path .. "mts255_hammer_arm.ogg", t = 4.3 },
        }
    },

    ["inspect"] = { Source = "idle" },    -- shutup arc9

    ["check_real"] = { Source = "check_real", EventTable = {
        { s = randspin, t = 0.14 },
        { s = randspin, t = 0.1 },
        { s = path .. "flaregun_barrel_open.ogg", t = 0.5 },
        { s = path .. "flaregun_barrel_close.ogg", t = 1.22 },
        { s = randspin, t = 1.7 },
    } },
    ["check_real_empty"] = { Source = "check_real_empty", EventTable = {
        { s = randspin, t = 0.14 },
        { s = randspin, t = 0.1 },
        { s = path .. "flaregun_barrel_open.ogg", t = 0.5 },
        { s = path .. "flaregun_barrel_close.ogg", t = 1.22 },
        { s = randspin, t = 1.7 },
    } },

    ["look"] = { Source = "look", EventTable = {
        { s = randspin, t = 0.15 },
        { s = randspin, t = 1.64 },
        { s = randspin, t = 2.78 },
    } },
    ["look_empty"] = { Source = "look_empty", EventTable = {
        { s = randspin, t = 0.18 },
        { s = randspin, t = 1.64 },
        { s = randspin, t = 2.85 },
    } },
}

------------------------- |||           Attachments            ||| -------------------------

SWEP.EFTRequiredAtts = { "HasGranataAmmo" }

SWEP.AttachmentElements = {
    ["eft_ammo_26x75_green"]    = { Bodygroups = { {1, 1} } },
    ["eft_ammo_26x75_greenp"]    = { Bodygroups = { {1, 1} } },
    ["eft_ammo_26x75_red"]    = { Bodygroups = { {1, 2} } },
    ["eft_ammo_26x75_awhite"]    = { Bodygroups = { {1, 3} } },
    ["eft_ammo_26x75_yellow"]    = { Bodygroups = { {1, 4} } },
}


SWEP.Attachments = {
    {
        PrintName = ARC9:GetPhrase("eft_cat_ammo"),
        Category = {"eft_ammo_26x75"},
        Bone = "patron_in_weapon",
        Pos = Vector(0, 0, 0),
        Ang = Angle(0, 0, 0),
        Installed = "eft_ammo_26x75_green",
        Integral = "eft_ammo_26x75_green",
    },
    {
        PrintName = ARC9:GetPhrase("eft_cat_custom"),
        Category = {"eft_custom_slot", "eft_custom_sp81"},
        Bone = "weapon",
        Pos = Vector(0, 12, -1),
        Ang = Angle(90, -90, 90),
        Icon_Offset = Vector(0, 0, 0),
        CosmeticOnly = false,
    },
}