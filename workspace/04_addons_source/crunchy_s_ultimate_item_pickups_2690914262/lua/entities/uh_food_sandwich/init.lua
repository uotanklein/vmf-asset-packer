AddCSLuaFile( "shared.lua" )
AddCSLuaFile( "cl_init.lua" )

include( "shared.lua" )

ENT.WorldModel = "models/crunchy/props/underhell_props/pg_sandwich.mdl"

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
	local health = activator:Health()
	activator:SetHealth( math.Clamp( ( health or 100 ) + 15, 0, 250 ) )
	self:Remove()
	activator:EmitSound("nmrih_food_2.wav", 100, 100)
end