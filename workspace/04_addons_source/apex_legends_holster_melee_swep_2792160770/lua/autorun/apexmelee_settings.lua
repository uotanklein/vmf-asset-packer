if CLIENT then

	hook.Add("PopulateToolMenu", "ApexMeleeSettings", function()
	
		spawnmenu.AddToolMenuOption("Options", "Apex Unarmed SWEP Settings", "ApexMeleeSettings_Client", "Client", "", "", function(panel)

			local ApexMeleeSettings = {
				Options = {}, 
				CVars = {}, 
				Label = "#Presets", 
				MenuButton = "1", 
				Folder = "Apex Unarmed SWEP Settings"
			}
			
			ApexMeleeSettings.Options["#Default"] = {	
				cl_apexmelee_animwalk       = "1",
                cl_apexmelee_animsprint     = "1",
                cl_apexmelee_animcrouch     = "1",
                cl_apexmelee_animjump       = "1",
                cl_apexmelee_animjumpsprint = "1",
                cl_apexmelee_hitmarker      = "1",
			}

			panel:AddControl("ComboBox", ApexMeleeSettings)
			
			panel:AddControl("CheckBox", {
				Label = "Walk Animation",
				Command = "cl_apexmelee_animwalk",
			})
			
			panel:AddControl("CheckBox", {
				Label 	= "Sprint Animation",
				Command 	= "cl_apexmelee_animsprint",
			})
			
			panel:AddControl("CheckBox", {
				Label 	= "Crouch Animation",
				Command 	= "cl_apexmelee_animcrouch",
			})
			
			panel:AddControl("CheckBox", {
				Label 	= "Jump Animation",
				Command 	= "cl_apexmelee_animjump",
			})
			
			panel:AddControl("CheckBox", {
				Label 	= "Jump Sprint Animation",
				Command 	= "cl_apexmelee_animjumpsprint",
			})
			
			panel:AddControl("Label", {Text = ""})
			
			panel:AddControl("CheckBox", {
				Label = "Hitmarker",
				Command = "cl_apexmelee_hitmarker",
			})
			
		end)
	
	end)
	
end


/*===============================================================
							Clientside
===============================================================*/

if !ConVarExists("cl_apexmelee_animwalk") then
    CreateClientConVar("cl_apexmelee_animwalk", '1', FCVAR_ARCHIVE)
end

if !ConVarExists("cl_apexmelee_animsprint") then
    CreateClientConVar("cl_apexmelee_animsprint", '1', FCVAR_ARCHIVE)
end

if !ConVarExists("cl_apexmelee_animcrouch") then
    CreateClientConVar("cl_apexmelee_animcrouch", '1', FCVAR_ARCHIVE)
end

if !ConVarExists("cl_apexmelee_animjump") then
    CreateClientConVar("cl_apexmelee_animjump", '1', FCVAR_ARCHIVE)
end

if !ConVarExists("cl_apexmelee_animjumpsprint") then
    CreateClientConVar("cl_apexmelee_animjumpsprint", '1', FCVAR_ARCHIVE)
end

if !ConVarExists("cl_apexmelee_hitmarker") then
    CreateClientConVar("cl_apexmelee_hitmarker", '1', FCVAR_ARCHIVE)
end