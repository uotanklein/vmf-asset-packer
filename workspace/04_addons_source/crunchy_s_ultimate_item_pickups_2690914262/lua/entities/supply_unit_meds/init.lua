if( SERVER ) then
	AddCSLuaFile("cl_init.lua")
	AddCSLuaFile("shared.lua")
	include( "shared.lua" )
end

local shouldOccur = true

function ENT:funcSpawnOpenedCrate()
	if shouldOccur then
	
		self:SetSkin( 1 )
		self:SetPlaybackRate( 0.1)
		self:EmitSound( "supply_unit_open.wav" )
		self:ResetSequence( "opening" ) -- Play the open sequence
		
		shouldOccur = false
		timer.Simple( 1, function() 
		
		local ent = ents.Create( "supply_unit_meds_opened" )
		if ( !IsValid( ent ) ) 
			then 
			return
		end
		
		ent:SetPos( self:GetBonePosition( 0 ))
		ent:SetAngles( self:GetAngles())
		ent:Spawn()
		
		shouldOccur = true
		self:Remove()
		
		end )
	else
	end
end

	
	
function ENT:SpawnFunction( ply, tr, class )
	if ( !tr.Hit ) then return end
	local pos = tr.HitPos + tr.HitNormal * 4
	local ent = ents.Create( class )
	ent:SetPos( pos )
	ent:Spawn()
	ent:Activate()
	shouldOccur = true
	
	return ent
end

function ENT:Initialize()
	self:SetModel( "models/crunchy/props/borderlands_props/dahlammocrate_meds.mdl")
	self:PhysicsInit( SOLID_VPHYSICS )      -- Make us work with physics,
	self:SetMoveType( MOVETYPE_VPHYSICS )   -- after all, gmod is a physics
	self:SetSolid( SOLID_VPHYSICS )         -- Toolbox
	self:PrecacheGibs()
	
	local phys = self:GetPhysicsObject()
	if (phys:IsValid()) then
		phys:Wake()
	end

end

function ENT:Use( activator, caller )
	self:funcSpawnOpenedCrate()
end

function ENT:Think()

	if SERVER then
		self:NextThink(CurTime())
	return true
	end
end

function ENT:Remove()

end

function ENT:OnTakeDamage(dmg)

end