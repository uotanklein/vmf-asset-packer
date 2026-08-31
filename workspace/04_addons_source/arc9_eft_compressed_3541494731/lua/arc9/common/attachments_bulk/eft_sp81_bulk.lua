local ATT = {}

///////////////////////////////////////      eft_ammo_26x75_green
ATT = {}
ATT.PrintName = "26x75mm flare cartridge (Green)"
ATT.CompactName = "Green"
ATT.Icon = Material("entities/eft_sp81_attachments/g.png", "mips smooth")
ATT.Description = [[A 26x75mm green flare cartridge for the SP-81 flare gun.]]
ATT.SortOrder = 0
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasGranataAmmo = true 
ATT.ClipSize = 1
ATT.ShootEnt = "arc9_eft_26x75_green"

ATT.Category = {"eft_ammo_26x75"}

ARC9.LoadAttachment(ATT, "eft_ammo_26x75_green")

///////////////////////////////////////      eft_ammo_26x75_red
ATT = {}
ATT.PrintName = "26x75mm flare cartridge (Red)"
ATT.CompactName = "Red"
ATT.Icon = Material("entities/eft_sp81_attachments/r.png", "mips smooth")
ATT.Description = [[A 26x75mm red flare cartridge for the SP-81 flare gun.]]
ATT.SortOrder = 0
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasGranataAmmo = true 
ATT.ClipSize = 1
ATT.ShootEnt = "arc9_eft_26x75_red"

ATT.Category = {"eft_ammo_26x75"}

ARC9.LoadAttachment(ATT, "eft_ammo_26x75_red")

///////////////////////////////////////      eft_ammo_26x75_awhite
ATT = {}
ATT.PrintName = "26x75mm flare cartridge (White)"
ATT.CompactName = "Flare"
ATT.Icon = Material("entities/eft_sp81_attachments/w.png", "mips smooth")
ATT.Description = [[A 26x75mm 7S15 (26 OP) night flare cartridge for the SP-81 flare gun.]]
ATT.SortOrder = 0
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasGranataAmmo = true 
ATT.ClipSize = 1
ATT.ShootEnt = "arc9_eft_26x75_white"

ATT.Category = {"eft_ammo_26x75"}

ARC9.LoadAttachment(ATT, "eft_ammo_26x75_awhite")

///////////////////////////////////////      eft_ammo_26x75_yellow
ATT = {}
ATT.PrintName = "26x75mm flare cartridge (Yellow)"
ATT.CompactName = "Yellow"
ATT.Icon = Material("entities/eft_sp81_attachments/y.png", "mips smooth")
ATT.Description = [[A 26x75mm yellow flare cartridge for the SP-81 flare gun.]]
ATT.SortOrder = 0
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasGranataAmmo = true 
ATT.ClipSize = 1
ATT.ShootEnt = "arc9_eft_26x75_yellow"

ATT.Category = {"eft_ammo_26x75"}

ARC9.LoadAttachment(ATT, "eft_ammo_26x75_yellow")

///////////////////////////////////////      eft_ammo_26x75_greenp
ATT = {}
ATT.PrintName = "26x75mm distress signal flare (poison green)"
ATT.CompactName = "DSF"
ATT.Icon = Material("entities/eft_sp81_attachments/g.png", "mips smooth")
ATT.Description = [[Signal cartridge caliber 26x75mm for SP-81. The unusual color indicates that the cartridge is used for some special signals to "friends". It makes sense to try to use it to save lives in the presence of scavs or bosses.

no lol it doesn't do anything, here it acts same as green one]]
ATT.SortOrder = 90
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.HasGranataAmmo = true 
ATT.ClipSize = 1
ATT.ShootEnt = "arc9_eft_26x75_green"

ATT.Category = {"eft_ammo_26x75"}

ARC9.LoadAttachment(ATT, "eft_ammo_26x75_greenp")