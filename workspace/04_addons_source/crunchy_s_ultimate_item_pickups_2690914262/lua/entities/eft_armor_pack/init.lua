AddCSLuaFile( "shared.lua" )
AddCSLuaFile( "cl_init.lua" )

include( "shared.lua" )

ENT.WorldModel = "models/crunchy/props/eft_props/armorrepair.mdl"

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


	self:SetModel( self.WorldModel )
	self:PhysicsInit( SOLID_VPHYSICS )
	self:SetMoveType( MOVETYPE_VPHYSICS )
	self.Entity:DrawShadow(true)
	
	local phys = self:GetPhysicsObject()
	self.nodupe = true
	self.ShareGravgun = true

	phys:Wake()
end	

function ENT:Use( activator )
	local armor = activator:Armor()
	activator:SetArmor( math.Clamp( ( armor or 100 ) + 50, 0, 250 ) )
	self:Remove()
	activator:EmitSound("armor_upgrade.wav", 100, 100)
end