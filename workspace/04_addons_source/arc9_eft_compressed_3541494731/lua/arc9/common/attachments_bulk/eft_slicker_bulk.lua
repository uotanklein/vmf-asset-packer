local ATT = {}

///////////////////////////////////////      eft_tactical_slickers

ATT = {}
ATT.PrintName = "Slickers chocolate bar"
ATT.CompactName = "Slickers"
ATT.Icon = Material("entities/arc9_slickers.png", "mips smooth")
ATT.Description = [[A sweet nutritional bar for a quick bite. Well balanced in proteins, fiber, and vitamins, but a bit over the top in sweetness.]]
ATT.SortOrder = 0

ATT.Model = "models/weapons/arc9/darsu_eft/mods/slicker.mdl"
ATT.ModelOffset = Vector(0, -0.7, 0)
ATT.ModelAngleOffset = Angle(0, 0, 90)
ATT.MenuCategory = "ARC9 - EFT Attachments"
ATT.Category = {"eft_25mm"}

ATT.EFTErgoAdd = 1
ATT.CustomPros = { Ergonomics = "+1" }
ATT.RecoilMult = 0.985
ATT.VisualRecoilMult = 0.985

ARC9.LoadAttachment(ATT, "eft_tactical_slickers")

///////////////////////////////////////      eft_mag_slickers

ATT = {}
ATT.PrintName = "Slickers chocolate bar"
ATT.CompactName = "Slickers"
ATT.Icon = Material("entities/arc9_slickers.png", "mips smooth")
ATT.Description = [[A sweet nutritional bar for a quick bite. Well balanced in proteins, fiber, and vitamins, but a bit over the top in sweetness.]]

ATT.Model = "models/weapons/arc9/darsu_eft/mods/slicker_mag.mdl"
ATT.MenuCategory = "ARC9 - EFT Attachments"

ATT.EFTErgoAdd = -1
ATT.CustomCons = { Ergonomics = "-1" }
ATT.RecoilMult = 0.985
ATT.VisualRecoilMult = 0.985

ATT.ActivateElements = {"hasmag"}
ATT.Category = {"eft_g17_mag"}

ARC9.LoadAttachment(ATT, "eft_mag_slickers")

///////////////////////////////////////      eft_scope_slickers30mm

ATT = {}
ATT.PrintName = "Slickers chocolate bar"
ATT.CompactName = "Slickers"
ATT.Icon = Material("entities/arc9_slickers.png", "mips smooth")
ATT.Description = [[A sweet nutritional bar for a quick bite. Well balanced in proteins, fiber, and vitamins, but a bit over the top in sweetness.]]
ATT.SortOrder = 0

ATT.Model = "models/weapons/arc9/darsu_eft/mods/slicker.mdl"
ATT.ModelOffset = Vector(-1.5, 0, 0)
ATT.MenuCategory = "ARC9 - EFT Attachments"
ATT.Category = {"eft_optic_25mm", "eft_optic_30mm"}

ATT.EFTErgoAdd = 1
ATT.CustomPros = { Ergonomics = "+1" }
ATT.RecoilMult = 0.985
ATT.VisualRecoilMult = 0.985

ARC9.LoadAttachment(ATT, "eft_scope_slickers30mm")

///////////////////////////////////////      eft_scope_slickers34mm

ATT = {}
ATT.PrintName = "Slickers chocolate bar"
ATT.CompactName = "Slickers"
ATT.Icon = Material("entities/arc9_slickers.png", "mips smooth")
ATT.Description = [[A sweet nutritional bar for a quick bite. Well balanced in proteins, fiber, and vitamins, but a bit over the top in sweetness.]]
ATT.SortOrder = 0

ATT.Model = "models/weapons/arc9/darsu_eft/mods/slicker.mdl"

ATT.MenuCategory = "ARC9 - EFT Attachments"
ATT.Category = {"eft_optic_34mm", "eft_slickers"}

ATT.EFTErgoAdd = 1
ATT.CustomPros = { Ergonomics = "+1" }
ATT.RecoilMult = 0.985
ATT.VisualRecoilMult = 0.985

ARC9.LoadAttachment(ATT, "eft_scope_slickers34mm")