if( SERVER ) then
	AddCSLuaFile("cl_init.lua")
	AddCSLuaFile("shared.lua")
	include( "shared.lua" )
end
	
function ENT:SpawnFunction( ply, tr, class )
	if ( !tr.Hit ) then return end
	local pos = tr.HitPos + tr.HitNormal * 4
	local ent = ents.Create( class )
	ent:SetPos( pos )
	ent:Spawn()
	ent:Activate()
	
	return ent
end

function ENT:Initialize()
	self:SetModel( "models/crunchy/props/borderlands_props/dahlammocrate_opened_rations.mdl")
	self:PhysicsInit( SOLID_VPHYSICS )      -- Make us work with physics,
	self:SetMoveType( MOVETYPE_VPHYSICS )   -- after all, gmod is a physics
	self:SetSolid( SOLID_VPHYSICS )         -- Toolbox
	self:PrecacheGibs()
	
	local phys = self:GetPhysicsObject()
	if (phys:IsValid()) then
		self:GetPhysicsObject():EnableMotion(false)
	end
	
	for i = math.random(1, 3),1,-1 do 
		
		math.random()
		local loottype = math.random(1, 6)
		local loottype_name
		
		if (loottype == 1) then 
			loottype_name = "nmrih_food_protein"
		elseif (loottype == 2) then 
			loottype_name = "nmrih_food_oatmeal"
		elseif (loottype == 3) then 
			loottype_name = "nmrih_food_pasta"
		elseif (loottype == 4) then 
			loottype_name = "nmrih_food_candy"
		elseif (loottype == 5) then 
			loottype_name = "stalker_food_energydrink_water"
		elseif (loottype == 6) then 
			loottype_name = "eft_food_mre_white"
		end
		
		local ent = ents.Create( loottype_name )
		if ( !IsValid( ent ) ) 
			then 
			return
		end
		
		ent:SetAngles( self:GetAngles())
		ent:SetPos( self:GetBonePosition( 3 + ((i - 1) * 2 )))
		
		ent:Spawn()
		if ent:GetPhysicsObject():IsValid() then
			ent:GetPhysicsObject():Sleep()
		end
		
	end
	
	for i = math.random(2, 3),1,-1 do 
		
		math.random()
		local loottype = math.random(1, 6)
		local loottype_name
		
		if (loottype == 1) then 
			loottype_name = "nmrih_food_protein"
		elseif (loottype == 2) then 
			loottype_name = "nmrih_food_oatmeal"
		elseif (loottype == 3) then 
			loottype_name = "nmrih_food_pasta"
		elseif (loottype == 4) then 
			loottype_name = "nmrih_food_candy"
		elseif (loottype == 5) then 
			loottype_name = "stalker_food_energydrink_water"
		elseif (loottype == 6) then 
			loottype_name = "eft_food_mre_white"
		end
		
		local ent = ents.Create( loottype_name )
		if ( !IsValid( ent ) ) 
			then 
			return
		end
		
		ent:SetAngles( self:GetAngles())
		ent:SetPos( self:GetBonePosition( 2 + ((i - 1) * 2 )) + Vector(0, 0, 2))
		
		ent:Spawn()
		if ent:GetPhysicsObject():IsValid() then
			ent:GetPhysicsObject():Sleep()
		end
	end

end

function ENT:Use( activator, caller )

end

function ENT:Think()

end

function ENT:Remove()

end

function ENT:OnTakeDamage(dmg)

end