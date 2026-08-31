local ATT = {}


///////////////////////////////////////      eft_hg_ak_ak74_metro


ATT = {}

ATT.PrintName = "Khyber Customs Swiss Cheese Grater/Makeshift AK-74 Handguard"
ATT.CompactName = "Metro Kalash (74)"
ATT.Icon = Material("entities/eft_ak_attachments/hg/metro_74.png", "mips smooth")
ATT.Description = [[An Armory Station-produced wooden AK-74 handguard, with a heat vent made from repurposed pipes and scrap metal.]]
ATT.SortOrder = -1
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasHG = true
ATT.Model = "models/weapons/arc9/darsu_eft/mods/ak_hg_ak74_std_metro_l.mdl"
ATT.LHIK = true

ATT.EFTErgoAdd = 4
ATT.CustomPros = { Ergonomics = "+4" }
ATT.HeatCapacityMult = 1.108

ATT.RequireElements = {"gasblock"}
ATT.Category = {"eft_ak_handguard", "eft_vityaz_handguard"}

ARC9.LoadAttachment(ATT, "eft_hg_ak_ak74_metro")

///////////////////////////////////////      eft_hg_ak_aksu_metro


ATT = {}

ATT.PrintName = "Khyber Customs Swiss Cheese Grater/Makeshift AKSU Handguard"
ATT.CompactName = "Metro Kalash (SU)"
ATT.Icon = Material("entities/eft_ak_attachments/hg/metro_74.png", "mips smooth")
ATT.Description = [[An Armory Station-produced wooden AKSU handguard, with a heat vent made from repurposed pipes and scrap metal.]]
ATT.SortOrder = -1
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasHG = true
ATT.Model = "models/weapons/arc9/darsu_eft/mods/aksu_hg_std_metro_l.mdl"
ATT.LHIK = true

ATT.EFTErgoAdd = 6
ATT.CustomPros = { Ergonomics = "+6" }
ATT.HeatCapacityMult = 1.108

ATT.RequireElements = {"gasblock"}
ATT.Category = {"eft_aksu_handguard"}

ARC9.LoadAttachment(ATT, "eft_hg_ak_aksu_metro")

///////////////////////////////////////      eft_aksu_hg_ak_vityaz


ATT = {}

ATT.PrintName = "AKS-74U wooden handguard"
ATT.CompactName = "6P26 Sb.9"
ATT.Icon = Material("entities/eft_ak_attachments/hg/74m.png", "mips smooth")
ATT.Description = [[A polymer handguard for AKS-74U, AKS-74UN, and AKS-74UB, manufactured by Izhmash.]]
ATT.SortOrder = 0
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasHG = true
ATT.Model = "models/weapons/arc9/darsu_eft/mods/aksu_hg_vityaz.mdl"
ATT.LHIK = true

ATT.EFTErgoAdd = 4
ATT.CustomPros = { Ergonomics = "+4" }
ATT.HeatCapacityMult = 1.052

ATT.RequireElements = {"gasblock"}
ATT.Category = {"eft_aksu_handguard"}


ARC9.LoadAttachment(ATT, "eft_aksu_hg_ak_vityaz")

///////////////////////////////////////      eft_hg_ak_ak103_metro


ATT = {}

ATT.PrintName = "Khyber Customs Swiss Cheese Grater/Makeshift AKM Handguard"
ATT.CompactName = "Metro Kalash (M)"
ATT.Icon = Material("entities/eft_ak_attachments/hg/metro_103.png", "mips smooth")
ATT.Description = [[An Armory Station-produced wooden AKM/103 handguard, with a heat vent made from repurposed pipes and scrap metal.]]
ATT.SortOrder = -1
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasHG = true
ATT.Model = "models/weapons/arc9/darsu_eft/mods/ak_hg_akm_std_metro_l.mdl"
ATT.LHIK = true

ATT.EFTErgoAdd = 4
ATT.CustomPros = { Ergonomics = "+4" }
ATT.HeatCapacityMult = 1.108

ATT.RequireElements = {"gasblock"}
ATT.Category = {"eft_ak_handguard", "eft_vityaz_handguard"}

ARC9.LoadAttachment(ATT, "eft_hg_ak_ak103_metro")


///////////////////////////////////////      eft_extras_ak_metro_sound


ATT = {}

ATT.PrintName = "Metro: Last Light Redux Kalash Sounds"
ATT.CompactName = "Kalash Sounds"
ATT.Icon = Material("entities/eft_ak_attachments/metro_kalash.png", "mips smooth")
ATT.Description = [[Changes the unsilenced firing sounds to mixed ones from the Kalash in Metro: Last Light Redux.]]
ATT.SortOrder = -1
ATT.AttNotForNPCs = true 
ATT.MenuCategory = "ARC9 - EFT Attachments"
ATT.Folder = "Metro"

local path = "weapons/darsu_eft/ak/"

ATT.ShootSound = { path .. "fire_new/metro/akm_close_loop_1.ogg", path .. "fire_new/metro/akm_close_loop_2.ogg", path .. "fire_new/metro/akm_close_loop_3.ogg", path .. "fire_new/metro/akm_close_loop_4.ogg" }
ATT.LayerSound = path .. "fire_new/metro/akm_close_loop_tail.ogg"

ATT.ShootSoundIndoor = { path .. "fire_new/metro/akm_close_indoor_loop_1.ogg", path .. "fire_new/metro/akm_close_indoor_loop_2.ogg", path .. "fire_new/metro/akm_close_indoor_loop_3.ogg", path .. "fire_new/metro/akm_close_indoor_loop_4.ogg" }
ATT.LayerSoundIndoor = path .. "fire_new/metro/akm_close_indoor_loop_tail.ogg"

ATT.Attachments = {
    {
        PrintName = "Custom slot",
        Pos = Vector(0, 0, 1),
        Ang = Angle(0, 0, 0),
        Category = {"eft_custom_slot"},
    },
}

ATT.Category = {"eft_custom_slot"}

ARC9.LoadAttachment(ATT, "eft_extras_ak_metro_sound")

///////////////////////////////////////      eft_extras_vityaz_metro_sound


ATT = {}

ATT.PrintName = "Metro: Last Light Redux AKSU Sounds"
ATT.CompactName = "AKSU Sounds"
ATT.Icon = Material("entities/eft_ak_attachments/metro_aksu.png", "mips smooth")
ATT.Description = [[Changes the unsilenced firing sounds to mixed ones from the AKSU in Metro: Last Light Redux.]]
ATT.SortOrder = -1
ATT.AttNotForNPCs = true 
ATT.MenuCategory = "ARC9 - EFT Attachments"
ATT.Folder = "Metro"

local path = "weapons/darsu_eft/ak/"

ATT.ShootSound = { path .. "fire_new/metro/vityaz_outdoor_close_loop_1.ogg", path .. "fire_new/metro/vityaz_outdoor_close_loop_2.ogg", path .. "fire_new/metro/vityaz_outdoor_close_loop_3.ogg", path .. "fire_new/metro/vityaz_outdoor_close_loop_4.ogg" }
ATT.LayerSound = path .. "fire_new/metro/vityaz_outdoor_close_loop_tail.ogg"

ATT.ShootSoundIndoor = { path .. "fire_new/metro/vityaz_indoor_close_loop_1.ogg", path .. "fire_new/metro/vityaz_indoor_close_loop_2.ogg", path .. "fire_new/metro/vityaz_indoor_close_loop_3.ogg", path .. "fire_new/metro/vityaz_indoor_close_loop_4.ogg" }
ATT.LayerSoundIndoor = path .. "fire_new/metro/vityaz_indoor_close_loop_tail.ogg"

ATT.Attachments = {
    {
        PrintName = "Custom slot",
        Pos = Vector(0, 0, 1),
        Ang = Angle(0, 0, 0),
        Category = {"eft_custom_slot"},
    },
}

ATT.Category = {"eft_custom_slot"}

ARC9.LoadAttachment(ATT, "eft_extras_vityaz_metro_sound")

///////////////////////////////////////      eft_extras_saiga_metro_sound


ATT = {}

ATT.PrintName = "Metro: Last Light Redux Shambler Sounds"
ATT.CompactName = "Shambler Sounds"
ATT.Icon = Material("entities/eft_ak_attachments/metro_uboyneg.png", "mips smooth")
ATT.Description = [[Changes the unsilenced firing sounds to mixed ones from the Shambler in Metro: Last Light Redux.]]
ATT.SortOrder = -1
ATT.AttNotForNPCs = true 
ATT.MenuCategory = "ARC9 - EFT Attachments"
ATT.Folder = "Metro"

local path = "weapons/darsu_eft/ak/"

ATT.ShootSound = { path .. "fire_new/metro/saiga_outdoor_close1.ogg", path .. "fire_new/metro/saiga_outdoor_close2.ogg" }

ATT.ShootSoundIndoor = path .. "fire_new/metro/saiga_indoor_close1.ogg"

ATT.Attachments = {
    {
        PrintName = "Custom slot",
        Pos = Vector(0, 0, 1),
        Ang = Angle(0, 0, 0),
        Category = {"eft_custom_slot"},
    },
}

ATT.Category = {"eft_custom_slot"}

ARC9.LoadAttachment(ATT, "eft_extras_saiga_metro_sound")

///////////////////////////////////////      eft_extras_revolver_metro_sound


ATT = {}

ATT.PrintName = "Metro: Last Light Redux Revolver Sounds"
ATT.CompactName = "Revolver Sounds"
ATT.Icon = Material("entities/eft_ak_attachments/metro_revolver.png", "mips smooth")
ATT.Description = [[Changes the unsilenced firing sounds to mixed ones from the Revolver in Metro: Last Light Redux.]]
ATT.SortOrder = -1
ATT.AttNotForNPCs = true 
ATT.MenuCategory = "ARC9 - EFT Attachments"
ATT.Folder = "Metro"

local path = "weapons/darsu_eft/ak/"

ATT.ShootSound = path .. "fire_new/metro/rsh_12_outdoor_close_oneshot.ogg"
ATT.ShootSoundIndoor = path .. "fire_new/metro/rsh_12_indoor_close_oneshot.ogg"

ATT.Attachments = {
    {
        PrintName = "Custom slot",
        Pos = Vector(0, 0, 1),
        Ang = Angle(0, 0, 0),
        Category = {"eft_custom_slot"},
    },
}

ATT.Category = {"eft_custom_slot"}

ARC9.LoadAttachment(ATT, "eft_extras_revolver_metro_sound")

///////////////////////////////////////      eft_extras_drawholster_speed


ATT = {}

ATT.PrintName = "Faster draw speed"
ATT.CompactName = "Draw speed"
ATT.Icon = Material("entities/eft_extras_attachments/pistolpose.png", "mips smooth")
ATT.Description = [[dear god finally

eft metro extras attachment]]
ATT.SortOrder = -1
ATT.AttNotForNPCs = true 
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.DeployTimeMult = 0.7

ATT.Attachments = {
    {
        PrintName = "Custom slot",
        Pos = Vector(0, 0, 1),
        Ang = Angle(0, 0, 0),
        Category = {"eft_custom_slot"},
    },
}

ATT.Category = {"eft_custom_slot"}

ARC9.LoadAttachment(ATT, "eft_extras_drawholster_speed")

///////////////////////////////////////      eft_extras_adssprint_speed


ATT = {}

ATT.PrintName = "Faster ADS and Sprint-To-Fire speed"
ATT.CompactName = "ADS speed"
ATT.Icon = Material("entities/eft_extras_attachments/rif2pose.png", "mips smooth")
ATT.Description = [[fast

eft metro extras attachment]]
ATT.SortOrder = -1
ATT.AttNotForNPCs = true 
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.AimDownSightsTimeMult = 0.7
ATT.SprintToFireTimeMult = 0.7

ATT.Attachments = {
    {
        PrintName = "Custom slot",
        Pos = Vector(0, 0, 1),
        Ang = Angle(0, 0, 0),
        Category = {"eft_custom_slot"},
    },
}

ATT.Category = {"eft_custom_slot"}

ARC9.LoadAttachment(ATT, "eft_extras_adssprint_speed")